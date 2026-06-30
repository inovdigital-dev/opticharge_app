export interface OmiePrice {
  hour: number   // 0-23
  price: number  // €/MWh
  date: string   // YYYY-MM-DD
}

export async function fetchOmiePrices(date: string): Promise<OmiePrice[]> {
  const res = await fetch(`/api/omie?date=${date}`)
  if (!res.ok) throw new Error('Erro ao buscar preços OMIE')
  return res.json()
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
