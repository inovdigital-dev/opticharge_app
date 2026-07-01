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
  const dateFormatted = `${day}${month}${year}`

  // Tentativa 1: ficheiro do mercado diário (mais fiável)
  const fileUrl = `https://www.omie.es/pt/file-download?parents%5B%5D=marginalpdbc&filename=marginalpdbc_${year}${month}${day}.1`
  try {
    const res = await fetch(fileUrl, {
      headers: { 'Accept': 'text/plain, */*' },
      ...(force ? { cache: 'no-store' } : { next: { revalidate: 3600 } }),
    })
    if (res.ok) {
      const text = await res.text()
      const prices = parseOmieFile(text, date, country)
      if (prices.length >= 20) return { prices, isMock: false, source: 'omie-file' }
    }
  } catch { /* fallthrough */ }

  // Tentativa 2: API REST OMIE
  const apiUrl = `https://api.omie.es/api/v1/market-results/portugal/dam/?year=${year}&month=${month}&day=${day}&json=true`
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json()
      const prices = parseOmieApi(data, date)
      if (prices.length >= 20) return { prices, isMock: false, source: 'omie-api' }
    }
  } catch { /* fallthrough */ }

  // Verificar se D+1 ainda não foi publicado (OMIE publica ~11:30-12:30 UTC = ~12:30-13:30 PT)
  // D+1 = amanhã em UTC. Só bloqueamos se for D+2 ou além, ou se for D+1 mas antes das 13h UTC.
  const nowUTC = new Date()
  const todayUTCStr = nowUTC.toISOString().split('T')[0]
  const tomorrowUTC = new Date(nowUTC)
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)
  const tomorrowUTCStr = tomorrowUTC.toISOString().split('T')[0]
  const hourUTC = nowUTC.getUTCHours()

  // D+2 ou além: definitivamente não publicado
  if (date > tomorrowUTCStr) {
    console.warn(`OMIE: preços (${date}) muito à frente, não publicados`)
    void dateFormatted
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }
  // D+1 mas antes das 13h UTC: OMIE ainda não publicou
  if (date === tomorrowUTCStr && hourUTC < 13) {
    console.warn(`OMIE: preços D+1 (${date}) ainda não publicados (UTC: ${hourUTC}h)`)
    void dateFormatted
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }
  // D hoje mas antes das 13h UTC (arranque de dia): improvável mas defensivo
  if (date === todayUTCStr && hourUTC < 13) {
    console.warn(`OMIE: preços de hoje (${date}) antes das 13h UTC`)
    void dateFormatted
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  // Fallback: dados simulados
  console.warn(`OMIE: usando dados simulados para ${date}`)
  void dateFormatted
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

function parseOmieApi(data: Record<string, unknown>, date: string) {
  try {
    const results = data?.MarketResults as Record<string, unknown>[] | undefined
    if (!results?.length) return []
    const records = results[0]?.Record as Record<string, unknown>[] | undefined
    if (!records?.length) return []
    return records
      .map((r: Record<string, unknown>) => ({
        hour: Number(r.hour) - 1,
        price: Number(r.price),
        date,
      }))
      .filter(r => r.hour >= 0 && r.hour <= 23 && r.price >= 0)
  } catch {
    return []
  }
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
