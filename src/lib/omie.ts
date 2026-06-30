export interface OmiePrice {
  hour: number   // 0-23
  price: number  // €/MWh
  date: string   // YYYY-MM-DD
}

export interface OmieFetchResult {
  prices: OmiePrice[]
  isMock: boolean
  source: string  // 'omie-file' | 'omie-api' | 'supabase-cache' | 'mock' | 'not-published-yet'
}

export async function fetchOmiePrices(date: string): Promise<OmieFetchResult> {
  const res = await fetch(`/api/omie?date=${date}`)
  if (!res.ok) throw new Error('Erro ao buscar preços OMIE')
  const data = await res.json()
  // Compatibilidade: API antiga devolvia array, nova devolve { prices, isMock, source }
  if (Array.isArray(data)) {
    return { prices: data, isMock: false, source: 'legacy' }
  }
  return data as OmieFetchResult
}

export function formatDate(date: Date): string {
  // Usar hora local (não UTC) para não trocar datas a partir da meia-noite em Portugal (UTC+1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTomorrow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export function getToday(): Date {
  return new Date()
}
