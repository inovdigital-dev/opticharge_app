export type TariffOption =
  | 'simples'
  | 'bi-diario'
  | 'bi-semanal'
  | 'tri-diario'
  | 'tri-semanal'
  | 'tri-high-diario'
  | 'tri-high-semanal'

// Kept for backward compat / FormulaModal references
export type TariffType = 'bi-horario' | 'tri-horario'
export type Cycle = 'diario' | 'semanal'
export type Country = 'PT'
export type Language = 'pt'

export interface TariffSettings {
  tariffOption: TariffOption
  // Legacy fields — kept for backward compat, derived from tariffOption on save
  type: TariffType
  cycle: Cycle
  operator: string
  // Fórmula: (OMIE_kwh × adequacyFactor + innerCosts) × (1 + lossCoeff) + margin + TAR + tse + go + mfrr
  adequacyFactor: number
  innerCosts: number
  margin: number
  tse: number
  go: number
  mfrr: number
  lossCoeff: number
  iva: number
  iespe: number
  tarVazio: number
  tarForaVazio: number
  tarPonta: number
  tarCheia: number
  // Only used for Simples display; same value as tarForaVazio when Simples is selected
  biVazioStart: number
  biVazioEnd: number
  country: Country
  language: Language
}

// TAR 2026 ERSE — valores por opção horária
export const TAR_PRESETS: Record<TariffOption, Pick<TariffSettings, 'tarVazio' | 'tarForaVazio' | 'tarCheia' | 'tarPonta'>> = {
  'simples':          { tarForaVazio: 0.0607, tarVazio: 0.0607, tarCheia: 0.0607, tarPonta: 0.0607 },
  'bi-diario':        { tarForaVazio: 0.0835, tarVazio: 0.0158, tarCheia: 0.0412, tarPonta: 0.2452 },
  'bi-semanal':       { tarForaVazio: 0.0835, tarVazio: 0.0158, tarCheia: 0.0412, tarPonta: 0.2452 },
  'tri-diario':       { tarForaVazio: 0.0835, tarVazio: 0.0158, tarCheia: 0.0412, tarPonta: 0.2452 },
  'tri-semanal':      { tarForaVazio: 0.0835, tarVazio: 0.0158, tarCheia: 0.0412, tarPonta: 0.2452 },
  'tri-high-diario':  { tarForaVazio: 0.0835, tarVazio: 0.0150, tarCheia: 0.0524, tarPonta: 0.2457 },
  'tri-high-semanal': { tarForaVazio: 0.0835, tarVazio: 0.0150, tarCheia: 0.0524, tarPonta: 0.2457 },
}

export const TARIFF_OPTION_LABELS: Record<TariffOption, string> = {
  'simples':          'Simples',
  'bi-diario':        'Bi-horário — Ciclo Diário',
  'bi-semanal':       'Bi-horário — Ciclo Semanal',
  'tri-diario':       'Tri-horário — Ciclo Diário',
  'tri-semanal':      'Tri-horário — Ciclo Semanal',
  'tri-high-diario':  'Tri-horário > 20.7 kVA — Ciclo Diário',
  'tri-high-semanal': 'Tri-horário > 20.7 kVA — Ciclo Semanal',
}

export function deriveTariffOption(type: TariffType, cycle: Cycle): TariffOption {
  if (type === 'bi-horario') return cycle === 'semanal' ? 'bi-semanal' : 'bi-diario'
  return cycle === 'semanal' ? 'tri-semanal' : 'tri-diario'
}

export const DEFAULT_SETTINGS: TariffSettings = {
  tariffOption: 'bi-diario',
  type: 'bi-horario',
  cycle: 'diario',
  operator: 'G9 Smart Dynamic',
  adequacyFactor: 1.02,
  innerCosts: 0,
  margin: 0.0155,
  tse: 0,
  go: 0,
  mfrr: 0,
  lossCoeff: 0.03,
  iva: 0.23,
  iespe: 0.001,
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
  const opt = settings.tariffOption
  if (opt === 'simples') return 'fora-vazio'

  const dow = date.getDay()
  const isWeekend = dow === 0 || dow === 6
  const inVazioBlocoNocturno = hour >= 22 || hour < 8

  switch (opt) {
    case 'bi-diario':
      return inVazioBlocoNocturno ? 'vazio' : 'fora-vazio'

    case 'bi-semanal':
      if (isWeekend) return 'vazio'
      return inVazioBlocoNocturno ? 'vazio' : 'fora-vazio'

    // Tri-horário ≤20.7 kVA
    // Dias úteis — Ponta: 10h–13h e 19h–21h
    // Sábados/Dom/Feriados — sem Ponta; Dom/Feriados (Semanal) = Vazio todo o dia
    case 'tri-diario': {
      if (inVazioBlocoNocturno) return 'vazio'
      if (isWeekend) return hour < 9 ? 'vazio' : 'cheia'
      if ((hour >= 10 && hour < 13) || (hour >= 19 && hour < 21)) return 'ponta'
      return 'cheia'
    }

    case 'tri-semanal': {
      if (isWeekend) return 'vazio'
      if (inVazioBlocoNocturno) return 'vazio'
      if ((hour >= 10 && hour < 13) || (hour >= 19 && hour < 21)) return 'ponta'
      return 'cheia'
    }

    // Tri-horário >20.7 kVA
    // Dias úteis — Ponta: 9h30–12h00 e 18h30–21h30 → arredondado: 10h–12h e 19h–22h
    case 'tri-high-diario': {
      if (inVazioBlocoNocturno) return 'vazio'
      if (isWeekend) return hour < 9 ? 'vazio' : 'cheia'
      if ((hour >= 10 && hour < 12) || (hour >= 19 && hour < 22)) return 'ponta'
      return 'cheia'
    }

    case 'tri-high-semanal': {
      if (isWeekend) return 'vazio'
      if (inVazioBlocoNocturno) return 'vazio'
      if ((hour >= 10 && hour < 12) || (hour >= 19 && hour < 22)) return 'ponta'
      return 'cheia'
    }
  }
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
  const adeq = settings.adequacyFactor ?? 1.0
  const inner = settings.innerCosts ?? 0
  const tse = settings.tse ?? 0
  const go = settings.go ?? 0
  const mfrr = settings.mfrr ?? 0

  const preTax =
    (omie_kwh * adeq + inner) * (1 + settings.lossCoeff)
    + settings.margin + tar + tse + go + mfrr

  return preTax * (1 + settings.iva) + settings.iespe
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
  const threshold = avg * 0.95
  const cheapHours = hourPrices.filter(h => h.total <= threshold)
  const candidates = cheapHours.length >= 3 ? cheapHours : [...hourPrices].sort((a, b) => a.total - b.total).slice(0, 4)
  candidates.sort((a, b) => a.hour - b.hour)

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
