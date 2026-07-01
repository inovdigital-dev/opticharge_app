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

  // 2. Fetch OMIE
  const result = await fetchPrices(date, country, force)

  // 3. Guardar em cache Supabase se dados reais
  if (!result.isMock && result.prices.length >= 20) {
    try {
      await cachePrices(result.prices.map(p => ({ date, hour: p.hour, price_mwh: p.price })))
    } catch { /* ok */ }
  }

  return NextResponse.json({ prices: result.prices, isMock: result.isMock, source: result.source })
}

interface PricePoint { hour: number; price: number; date: string }
interface FetchResult { prices: PricePoint[]; isMock: boolean; source: string }

async function fetchPrices(date: string, country: string, force: boolean): Promise<FetchResult> {
  const [year, month, day] = date.split('-')

  // Calcular contexto de data
  const nowUTC = new Date()
  const todayUTCStr = nowUTC.toISOString().split('T')[0]
  const tomorrowUTC = new Date(nowUTC)
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)
  const tomorrowUTCStr = tomorrowUTC.toISOString().split('T')[0]
  const hourUTC = nowUTC.getUTCHours()

  // D+2 ou além: definitivamente não publicado
  if (date > tomorrowUTCStr) return { prices: [], isMock: false, source: 'not-published-yet' }

  // D+1 antes das 13h UTC: OMIE ainda não publicou (~11:30-12:30 UTC)
  if (date === tomorrowUTCStr && hourUTC < 13) {
    console.log(`OMIE: D+1 (${date}) ainda não publicado (UTC: ${hourUTC}h)`)
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  const fetchOpts = force ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }

  // --- Tentativa 1: ficheiro OMIE ---
  const fileUrl = `https://www.omie.es/pt/file-download?parents%5B%5D=marginalpdbc&filename=marginalpdbc_${year}${month}${day}.1`
  try {
    const res = await fetch(fileUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.omie.es/',
      },
      ...fetchOpts,
    })
    console.log(`OMIE file [${date}]: status=${res.status}`)
    if (res.ok) {
      const text = await res.text()
      if (text.trim().startsWith('<')) {
        console.error(`OMIE file [${date}]: recebeu HTML — possível bloqueio por IP do Vercel`)
      } else {
        const prices = parseOmieFile(text, date, country)
        console.log(`OMIE file [${date}]: parsed ${prices.length} horas`)
        if (prices.length >= 20) return { prices, isMock: false, source: 'omie-file' }
      }
    }
  } catch (e) { console.error(`OMIE file [${date}] erro:`, e) }

  // --- Tentativa 2: Energy Charts (Fraunhofer ISE) — mesmos preços OMIE, fonte alternativa ---
  // O mercado OMIE usa CET (UTC+2 verão, UTC+1 inverno). O "dia" começa à meia-noite CET.
  const monthNum = parseInt(month)
  const cetOffset = (monthNum >= 4 && monthNum <= 10) ? 2 : 1
  const mktStartHour = String(24 - cetOffset).padStart(2, '0')
  const prevDate = new Date(`${date}T00:00:00Z`)
  prevDate.setUTCDate(prevDate.getUTCDate() - 1)
  const prevDateStr = prevDate.toISOString().split('T')[0]
  const ecUrl = `https://api.energy-charts.info/price?bzn=PT&start=${prevDateStr}T${mktStartHour}:00:00Z&end=${date}T${mktStartHour}:00:00Z`
  try {
    const res = await fetch(ecUrl, { ...fetchOpts })
    console.log(`EnergyCharts [${date}]: status=${res.status}`)
    if (res.ok) {
      const data = await res.json()
      const prices = parseEnergyCharts(data, date, monthNum)
      console.log(`EnergyCharts [${date}]: parsed ${prices.length} horas`)
      if (prices.length >= 20) return { prices, isMock: false, source: 'energy-charts' }
    }
  } catch (e) { console.error(`EnergyCharts [${date}] erro:`, e) }

  // Ambas as fontes falharam
  if (date === tomorrowUTCStr) {
    console.warn(`Preços D+1 (${date}) não disponíveis após tentativas OMIE + EnergyCharts`)
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }
  if (date === todayUTCStr && hourUTC < 13) {
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  // Hoje: mock como último recurso
  console.warn(`Usando dados simulados para ${date}`)
  return { prices: generateMockPrices(date), isMock: true, source: 'mock' }
}

function parseOmieFile(text: string, date: string, country: string): PricePoint[] {
  // Formato: YEAR;MONTH;DAY;SLOT(1-96);ES_PRICE;PT_PRICE
  // 96 quarto-horas em CET. Portugal (UTC+1) está 1h atrás de Espanha (UTC+2 verão).
  // Slots 1-4 → CET 00:00-01:00 = PT 23:00-00:00 (hora 23 do dia)
  const priceCol = country === 'ES' ? 4 : 5
  const buckets = new Map<number, number[]>()

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('*') || line.toUpperCase().startsWith('MARGINAL')) continue
    const parts = line.split(';').map(p => p.trim())
    if (parts.length <= priceCol) continue
    const slot = parseInt(parts[3])
    if (isNaN(slot) || slot < 1 || slot > 96) continue
    const price = parseFloat(parts[priceCol].replace(',', '.'))
    if (isNaN(price) || price < -500 || price > 3000) continue
    const hour = slot <= 4 ? 23 : Math.floor((slot - 5) / 4)
    if (!buckets.has(hour)) buckets.set(hour, [])
    buckets.get(hour)!.push(price)
  }

  if (buckets.size < 20) return []
  return Array.from(buckets.entries())
    .map(([hour, prices]) => ({ hour, price: prices.reduce((s, p) => s + p, 0) / prices.length, date }))
    .sort((a, b) => a.hour - b.hour)
}

function parseEnergyCharts(
  data: { unix_seconds?: number[]; price?: number[] },
  date: string,
  month: number
): PricePoint[] {
  if (!data.unix_seconds?.length || !data.price?.length) return []
  const isSummer = month >= 4 && month <= 10
  const buckets = new Map<number, number[]>()

  for (let i = 0; i < data.unix_seconds.length; i++) {
    const price = data.price[i]
    if (typeof price !== 'number' || isNaN(price) || price < -500 || price > 3000) continue
    const d = new Date(data.unix_seconds[i] * 1000)
    // Portugal: UTC+1 verão, UTC+0 inverno
    const ptHour = isSummer ? (d.getUTCHours() + 1) % 24 : d.getUTCHours()
    if (!buckets.has(ptHour)) buckets.set(ptHour, [])
    buckets.get(ptHour)!.push(price)
  }

  if (buckets.size < 20) return []
  return Array.from(buckets.entries())
    .map(([hour, prices]) => ({ hour, price: prices.reduce((s, p) => s + p, 0) / prices.length, date }))
    .sort((a, b) => a.hour - b.hour)
}

function generateMockPrices(date: string): PricePoint[] {
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
