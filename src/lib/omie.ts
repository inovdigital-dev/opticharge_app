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
  return date.toISOString().split('T')[0]
}

export function getTomorrow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export function getToday(): Date {
  return new Date()
}
