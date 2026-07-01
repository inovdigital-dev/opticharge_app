import { NextRequest, NextResponse } from 'next/server'
import { getCachedPrices, cachePrices } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const country = req.nextUrl.searchParams.get('country') ?? 'PT'
  const force = req.nextUrl.searchParams.get('force') === 'true'
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // 1. Cache Supabase (ignorado se ?force=true)
  if (!force) {
    try {
      const cached = await getCachedPrices(date)
      if (cached && cached.length >= 24) {
        return NextResponse.json(cached.map(r => ({ hour: r.hour, price: r.price_mwh, date })))
      }
    } catch { /* sem cache */ }
  }

  // 2. OMIE
  const result = await fetchFromOmie(date, country, force)

  // 3. Guardar cache se dados reais (não simulados)
  if (!result.isMock && result.prices.length >= 20) {
    try {
      await cachePrices(result.prices.map(p => ({ date, hour: p.hour, price_mwh: p.price })))
    } catch { /* ok */ }
  }

  return NextResponse.json({ prices: result.prices, isMock: result.isMock, source: result.source })
}

interface FetchResult {
  prices: { hour: number; price: number; date: string }[]
  isMock: boolean
  source: string
}

async function fetchFromOmie(date: string, country: string, force = false): Promise<FetchResult> {
  const [year, month, day] = date.split('-')

  const browserHeaders = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.omie.es/pt/market-results/daily/daily-market/daily-negotiation/?scope=daily&nMonths=1',
  }

  // Determinar contexto de data antes de tentar fetch
  const nowUTC = new Date()
  const todayUTCStr = nowUTC.toISOString().split('T')[0]
  const tomorrowUTC = new Date(nowUTC)
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)
  const tomorrowUTCStr = tomorrowUTC.toISOString().split('T')[0]
  const hourUTC = nowUTC.getUTCHours()

  // D+2 ou além: não tentar, definitivamente não publicado
  if (date > tomorrowUTCStr) {
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }
  // D+1 antes das 13h UTC: OMIE ainda não publicou
  if (date === tomorrowUTCStr && hourUTC < 13) {
    console.log(`OMIE: D+1 (${date}) ainda não publicado (UTC: ${hourUTC}h)`)
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  // Tentativa: ficheiro do mercado diário
  const fileUrl = `https://www.omie.es/pt/file-download?parents%5B%5D=marginalpdbc&filename=marginalpdbc_${year}${month}${day}.1`
  try {
    const res = await fetch(fileUrl, {
      headers: browserHeaders,
      ...(force ? { cache: 'no-store' } : { next: { revalidate: 3600 } }),
    })
    console.log(`OMIE file [${date}]: status=${res.status}`)
    if (res.ok) {
      const text = await res.text()
      // Detectar HTML (página de erro ou redirect) em vez de CSV
      if (text.trim().startsWith('<')) {
        console.error(`OMIE file [${date}]: recebeu HTML em vez de CSV — possível bloqueio por IP`)
      } else {
        const prices = parseOmieFile(text, date, country)
        console.log(`OMIE file [${date}]: parsed ${prices.length} horas`)
        if (prices.length >= 20) return { prices, isMock: false, source: 'omie-file' }
      }
    }
  } catch (e) { console.error(`OMIE file [${date}] erro:`, e) }

  // Fetch falhou. Determinar resposta por contexto.
  if (date === tomorrowUTCStr) {
    // D+1 mas fetch falhou (OMIE atrasado ou a bloquear IP Vercel)
    console.warn(`OMIE: D+1 (${date}) não disponível após fetch — a mostrar como não publicado`)
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }
  if (date === todayUTCStr && hourUTC < 13) {
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  // Hoje, dados não disponíveis: fallback para mock como último recurso
  console.warn(`OMIE: usando dados simulados para ${date}`)
  return { prices: generateMockPrices(date), isMock: true, source: 'mock' }
}

function parseOmieFile(text: string, date: string, country: string) {
  // Formato real do ficheiro marginalpdbc:
  //   YEAR;MONTH;DAY;SLOT(1-96);ES_PRICE;PT_PRICE
  // São 96 quarto-horas (15 min) por dia.
  // Portugal (WET/WEST) está 1h atrás de Espanha (CET/CEST):
  //   Slots  1-4  → hora 23 PT (23:00–24:00)
  //   Slots  5-8  → hora  0 PT (00:00–01:00)
  //   Slots  9-12 → hora  1 PT (01:00–02:00)  …  etc.
  const priceCol = country === 'ES' ? 4 : 5

  const lines = text.split('\n')
  const buckets = new Map<number, number[]>()

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('*') || line.toUpperCase().startsWith('MARGINAL')) continue

    const parts = line.split(';').map(p => p.trim())
    if (parts.length <= priceCol) continue

    const slot = parseInt(parts[3])
    if (isNaN(slot) || slot < 1 || slot > 96) continue

    const price = parseFloat(parts[priceCol].replace(',', '.'))
    if (isNaN(price) || price < 0 || price > 3000) continue

    // Converter slot OMIE (CET, offset +4 slots = +1h face a PT)
    const hour = slot <= 4 ? 23 : Math.floor((slot - 5) / 4)
    if (!buckets.has(hour)) buckets.set(hour, [])
    buckets.get(hour)!.push(price)
  }

  if (buckets.size < 20) return []

  const hourPrices: { hour: number; price: number; date: string }[] = []
  for (const [hour, prices] of buckets) {
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length
    hourPrices.push({ hour, price: avg, date })
  }

  return hourPrices.sort((a, b) => a.hour - b.hour)
}

// Perfil realista de preços ibéricos (€/MWh) por hora do dia
function generateMockPrices(date: string) {
  const profile = [
    32, 28, 24, 20, 18, 16, 18, 38,
    72, 92, 105, 98, 85, 80, 88, 94,
    102, 118, 135, 120, 98, 78, 58, 42,
  ]
  return profile.map((base, hour) => ({
    hour,
    price: Math.max(0, base + (Math.random() - 0.5) * 10),
    date,
  }))
}
