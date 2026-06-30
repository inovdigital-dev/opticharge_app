'use client'

import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow, getPeriodLabel } from '@/lib/tariff'
import { Zap, TrendingDown, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
  label: string
}

function fmt(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

// Limiares com IVA 23%: excelente <0.14, bom <0.18, moderado <0.22, caro ≥0.22
// Limiares sem IVA: dividir por 1.23 → <0.114, <0.146, <0.179
function classify(price: number, hasIva: boolean): 'excelente' | 'bom' | 'normal' | 'caro' {
  const t = hasIva
    ? { a: 0.14, b: 0.18, c: 0.22 }
    : { a: 0.114, b: 0.146, c: 0.179 }
  if (price < t.a) return 'excelente'
  if (price < t.b) return 'bom'
  if (price < t.c) return 'normal'
  return 'caro'
}

function buildExplanation(
  prices: OmiePrice[],
  settings: TariffSettings,
  date: Date,
  window: ReturnType<typeof findOptimalWindow>
): string {
  if (!window || !prices.length) return ''

  const windowPrices = prices.filter(p => window.hours.includes(p.hour))
  const avgOmie = windowPrices.reduce((s, p) => s + p.price, 0) / windowPrices.length

  const allPrices = prices.map(p => ({
    hour: p.hour,
    total: calcPrice(p.price, getPeriodForHour(p.hour, settings, date), settings),
    period: getPeriodForHour(p.hour, settings, date),
  }))

  const maxPrice = Math.max(...allPrices.map(p => p.total))
  const windowPeriods = [...new Set(windowPrices.map(p => getPeriodForHour(p.hour, settings, date)))]
  const windowPeriodLabel = windowPeriods.map(getPeriodLabel).join(' e ')

  const savings = ((maxPrice - window.avgPrice) * 22).toFixed(2)
  const isOffPeakCheap = windowPeriods.includes('fora-vazio') && window.avgPrice < 0.08

  const ivaStr = settings.iva > 0 ? ` + IVA ${(settings.iva * 100).toFixed(0)}%` : ' (s/ IVA)'

  if (isOffPeakCheap) {
    return `Período ${windowPeriodLabel} (${fmt(window.startHour)}–${fmt(window.endHour)}): apesar da TAR ser mais elevada (${settings.tarForaVazio.toFixed(4)} €/kWh), o preço OMIE está muito baixo (${avgOmie.toFixed(2)} €/MWh), pelo que no somatório total — incluindo margem${ivaStr} — compensa mais do que o período de Vazio. Poupança estimada por carregamento (~22 kWh): ~${savings}€ vs. carregar no pior horário.`
  }

  return `Período ${windowPeriodLabel} (${fmt(window.startHour)}–${fmt(window.endHour)}): preço OMIE médio de ${avgOmie.toFixed(2)} €/MWh, resultando num custo total de ${window.avgPrice.toFixed(4)} €/kWh com TAR + margem${ivaStr} incluídos. Poupança estimada por carregamento (~22 kWh): ~${savings}€ vs. pior horário.`
}

export default function RecommendationBox({ prices, settings, date, label }: Props) {
  if (!prices.length) return null

  const window = findOptimalWindow(
    prices.map(p => ({ hour: p.hour, price: p.price })),
    settings,
    date
  )

  if (!window) return null

  const allTotals = prices.map(p =>
    calcPrice(p.price, getPeriodForHour(p.hour, settings, date), settings)
  )
  const minPrice = Math.min(...allTotals)
  const maxPrice = Math.max(...allTotals)
  const avgPrice = allTotals.reduce((s, v) => s + v, 0) / allTotals.length

  const classification = classify(window.avgPrice, settings.iva > 0)
  const explanation = buildExplanation(prices, settings, date, window)

  const styles = {
    'excelente': { Icon: Zap, color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', title: 'Ótimo para carregar!' },
    'bom': { Icon: TrendingDown, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800', title: 'Bom momento para carregar' },
    'normal': { Icon: Clock, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', title: 'Preços moderados' },
    'caro': { Icon: AlertTriangle, color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800', title: 'Energia cara' },
  }

  const { Icon, color, bg, title } = styles[classification]

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bg}`}>
      <div className={`flex items-center gap-2 font-semibold ${color}`}>
        <Icon size={18} />
        {title}
      </div>

      {/* Janela única */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">{label} — melhor período</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {fmt(window.startHour)} – {fmt(window.endHour)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {window.avgPrice.toFixed(4)}
          </div>
          <div className="text-xs text-gray-400">€/kWh</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Mín: <strong className="text-green-600">{minPrice.toFixed(4)} €/kWh</strong></span>
        <span>Média: <strong>{avgPrice.toFixed(4)} €/kWh</strong></span>
        <span>Máx: <strong className="text-red-600">{maxPrice.toFixed(4)} €/kWh</strong></span>
      </div>

      {/* Explicação */}
      {explanation && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  )
}
