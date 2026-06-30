export type TariffType = 'bi-horario' | 'tri-horario'
export type Cycle = 'diario' | 'semanal'

export interface TariffSettings {
  type: TariffType
  cycle: Cycle
  operator: string
  margin: number        // €/kWh operador (componente fixa)
  lossCoeff: number     // coeficiente de perdas (ex: 0.03)
  iva: number           // ex: 0.06
  iespe: number         // €/kWh (ex: 0.001)
  power: number         // kVA contratado
  // TAR personalizadas (€/kWh)
  tarVazio: number
  tarForaVazio: number
  tarPonta: number
  tarCheia: number
  // Horas dos períodos (bi-horário diário simples)
  biVazioStart: number  // hora início vazio (ex: 22)
  biVazioEnd: number    // hora fim vazio (ex: 8)
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
}

export type Period = 'vazio' | 'fora-vazio' | 'ponta' | 'cheia'

export function getPeriodForHour(hour: number, settings: TariffSettings, date: Date): Period {
  const dow = date.getDay() // 0=Dom, 6=Sab
  const isWeekend = dow === 0 || dow === 6

  if (settings.type === 'bi-horario') {
    if (settings.cycle === 'diario') {
      const inVazio = hour >= settings.biVazioStart || hour < settings.biVazioEnd
      return inVazio ? 'vazio' : 'fora-vazio'
    }
    // Ciclo semanal (simplificado para horário de verão)
    if (isWeekend) return 'vazio'
    const inVazio = hour < 7 || hour >= 24
    return inVazio ? 'vazio' : 'fora-vazio'
  }

  // Tri-horário (horário de verão simplificado)
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
