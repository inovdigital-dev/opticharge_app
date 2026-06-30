import { NextRequest, NextResponse } from 'next/server'
import { getCachedPrices, cachePrices } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const country = req.nextUrl.searchParams.get('country') ?? 'PT'
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // 1. Cache Supabase
  try {
    const cached = await getCachedPrices(date)
    if (cached && cached.length >= 24) {
      return NextResponse.json(cached.map(r => ({ hour: r.hour, price: r.price_mwh, date })))
    }
  } catch { /* sem cache */ }

  // 2. OMIE
  const result = await fetchFromOmie(date, country)

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

async function fetchFromOmie(date: string, country: string): Promise<FetchResult> {
  // Ficheiro OMIE: marginalpdbc_YYYYMMDD.1
  // Formato: FECHA;HORA(1-24);PRECIO_ES(€/MWh);PRECIO_PT(€/MWh)
  // Coluna PT = índice 3, ES = índice 2
  const [year, month, day] = date.split('-')
  const dateFormatted = `${day}${month}${year}` // OMIE usa DDMMYYYY no nome do ficheiro

  // Tentativa 1: ficheiro do mercado diário (mais fiável)
  const fileUrl = `https://www.omie.es/pt/file-download?parents%5B%5D=marginalpdbc&filename=marginalpdbc_${year}${month}${day}.1`
  try {
    const res = await fetch(fileUrl, {
      headers: { 'Accept': 'text/plain, */*' },
      next: { revalidate: 3600 },
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

  // Verificar se D+1 ainda não foi publicado (antes das 13h30)
  const now = new Date()
  const targetDate = new Date(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = targetDate.toDateString() === tomorrow.toDateString()
  const hourNow = now.getHours()
  if (isTomorrow && hourNow < 13) {
    // D+1 ainda não publicado — retornar vazio (UI trata este caso)
    console.warn(`OMIE: preços D+1 (${date}) ainda não publicados (${hourNow}h < 13h30)`)
    void dateFormatted
    return { prices: [], isMock: false, source: 'not-published-yet' }
  }

  // Fallback: dados simulados
  console.warn(`OMIE: usando dados simulados para ${date}`)
  void dateFormatted
  return { prices: generateMockPrices(date), isMock: true, source: 'mock' }
}

function parseOmieFile(text: string, date: string, country: string) {
  // Formato esperado: FECHA;HORA;PRECIO_ES;PRECIO_PT
  // Header tem "Fecha" ou "FECHA" - ignorar
  // Linhas com * são comentários - ignorar
  const priceCol = country === 'ES' ? 2 : 3

  const lines = text.split('\n')
  const prices: { hour: number; price: number; date: string }[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('*') || line.toLowerCase().startsWith('fecha') || line.toLowerCase().startsWith('hora')) continue

    const parts = line.split(';').map(p => p.trim().replace(',', '.'))
    if (parts.length <= priceCol) continue

    // A hora pode estar na coluna 1 (formato DD/MM/YYYY;H;...) ou coluna 0 pode ser só a hora
    let hourRaw = parseInt(parts[1])
    if (isNaN(hourRaw) || hourRaw < 1 || hourRaw > 24) {
      // Tentar coluna 0 como hora
      hourRaw = parseInt(parts[0])
      if (isNaN(hourRaw) || hourRaw < 1 || hourRaw > 24) continue
    }

    const hour = hourRaw - 1 // OMIE usa 1-24, converter para 0-23
    const price = parseFloat(parts[priceCol])

    if (!isNaN(price) && price >= 0 && price < 1000 && hour >= 0 && hour <= 23) {
      // Evitar duplicados (OMIE pode ter múltiplas linhas por hora em alguns ficheiros)
      if (!prices.find(p => p.hour === hour)) {
        prices.push({ hour, price, date })
      }
    }
  }

  return prices.sort((a, b) => a.hour - b.hour)
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
