export type TariffType = 'bi-horario' | 'tri-horario'
export type Cycle = 'diario' | 'semanal'
export type Country = 'PT' | 'ES'
export type Language = 'pt' | 'es'

export interface TariffSettings {
  type: TariffType
  cycle: Cycle
  operator: string
  margin: number
  lossCoeff: number
  iva: number
  iespe: number
  power: number
  tarVazio: number
  tarForaVazio: number
  tarPonta: number
  tarCheia: number
  biVazioStart: number
  biVazioEnd: number
  country: Country
  language: Language
}

export const DEFAULT_SETTINGS: TariffSettings = {
  type: 'bi-horario',
  cycle: 'diario',
  operator: 'G9 Smart Dynamic',
  margin: 0.0055,
  lossCoeff: 0.03,
  iva: 0.06,
  iespe: 0.001,
  power: 6.9,
  tarVazio: 0.0158,
  tarForaVazio: 0.0835,
  tarPonta: 0.2452,
  tarCheia: 0.0412,
  biVazioStart: 22,
  biVazioEnd: 8,
  country: 'PT',
  language: 'pt',
}

export type Period = 'vazio' | 'fora-vazio' | 'ponta' | 'cheia'

export function getPeriodForHour(hour: number, settings: TariffSettings, date: Date): Period {
  const dow = date.getDay()
  const isWeekend = dow === 0 || dow === 6

  if (settings.type === 'bi-horario') {
    if (settings.cycle === 'diario') {
      const inVazio = hour >= settings.biVazioStart || hour < settings.biVazioEnd
      return inVazio ? 'vazio' : 'fora-vazio'
    }
    if (isWeekend) return 'vazio'
    return hour < 7 ? 'vazio' : 'fora-vazio'
  }

  if (isWeekend) return 'vazio'
  if (hour < 8 || hour >= 22) return 'vazio'
  const isPonta = (hour >= 10 && hour < 13) || (hour >= 19 && hour < 21)
  if (isPonta) return 'ponta'
  return 'cheia'
}

export function getTarForPeriod(period: Period, settings: TariffSettings): number {
  switch (period) {
    case 'vazio': return settings.tarVazio
    case 'fora-vazio': return settings.tarForaVazio
    case 'ponta': return settings.tarPonta
    case 'cheia': return settings.tarCheia
  }
}

export function calcPrice(omie_mwh: number, period: Period, settings: TariffSettings): number {
  const omie_kwh = omie_mwh / 1000
  const tar = getTarForPeriod(period, settings)
  const base = omie_kwh * (1 + settings.lossCoeff) + settings.margin + tar
  return base * (1 + settings.iva) + settings.iespe
}

export interface OptimalWindow {
  startHour: number
  endHour: number
  avgPrice: number
  minPrice: number
  hours: number[]
}

export function getPeriodLabel(period: Period): string {
  switch (period) {
    case 'vazio': return 'Vazio'
    case 'fora-vazio': return 'Fora de Vazio'
    case 'ponta': return 'Ponta'
    case 'cheia': return 'Cheia'
  }
}

export function findOptimalWindow(
  prices: { hour: number; price: number }[],
  settings: TariffSettings,
  date: Date
): OptimalWindow | null {
  if (!prices.length) return null

  const sorted = [...prices].sort((a, b) => a.hour - b.hour)
  const hourPrices = sorted.map(p => ({
    hour: p.hour,
    total: calcPrice(p.price, getPeriodForHour(p.hour, settings, date), settings),
  }))

  const avg = hourPrices.reduce((s, h) => s + h.total, 0) / hourPrices.length
  // Threshold: horas abaixo da média são candidatas
  const threshold = avg * 0.95
  const cheapHours = hourPrices.filter(h => h.total <= threshold)

  const candidates = cheapHours.length >= 3 ? cheapHours : [...hourPrices].sort((a, b) => a.total - b.total).slice(0, 4)
  candidates.sort((a, b) => a.hour - b.hour)

  // Agrupar em blocos contíguos
  const blocks: { hours: number[]; prices: number[] }[] = []
  let current: { hours: number[]; prices: number[] } | null = null

  for (const h of candidates) {
    if (!current || h.hour - current.hours[current.hours.length - 1] > 1) {
      current = { hours: [h.hour], prices: [h.total] }
      blocks.push(current)
    } else {
      current.hours.push(h.hour)
      current.prices.push(h.total)
    }
  }

  if (!blocks.length) return null

  // Melhor bloco = menor preço médio com pelo menos 1h
  const best = blocks.sort((a, b) => {
    const avgA = a.prices.reduce((s, v) => s + v, 0) / a.prices.length
    const avgB = b.prices.reduce((s, v) => s + v, 0) / b.prices.length
    return avgA - avgB
  })[0]

  const avgPrice = best.prices.reduce((s, v) => s + v, 0) / best.prices.length
  const minPrice = Math.min(...best.prices)

  return {
    startHour: best.hours[0],
    endHour: best.hours[best.hours.length - 1] + 1,
    avgPrice,
    minPrice,
    hours: best.hours,
  }
}
