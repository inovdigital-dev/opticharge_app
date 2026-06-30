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

function classify(price: number): 'muito-barato' | 'barato' | 'normal' | 'caro' {
  if (price < 0.06) return 'muito-barato'
  if (price < 0.10) return 'barato'
  if (price < 0.16) return 'normal'
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

  if (isOffPeakCheap) {
    return `Período ${windowPeriodLabel} (${fmt(window.startHour)}–${fmt(window.endHour)}): apesar da TAR ser mais elevada (${(settings.tarForaVazio * 100).toFixed(1)} cênt/kWh), o preço OMIE está muito baixo (${avgOmie.toFixed(1)} €/MWh), pelo que no somatório total — incluindo margem e IVA — compensa mais do que o período de Vazio. Poupança estimada por carregamento (~22 kWh): ~${savings}€ vs. carregar no pior horário.`
  }

  return `Período ${windowPeriodLabel} (${fmt(window.startHour)}–${fmt(window.endHour)}): preço OMIE médio de ${avgOmie.toFixed(1)} €/MWh, resultando num custo total de ${(window.avgPrice * 100).toFixed(2)} cênt/kWh com TAR + margem + IVA incluídos. Poupança estimada por carregamento (~22 kWh): ~${savings}€ vs. pior horário.`
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

  const classification = classify(window.avgPrice)
  const explanation = buildExplanation(prices, settings, date, window)

  const styles = {
    'muito-barato': { Icon: Zap, color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', title: 'Energia muito barata!' },
    'barato': { Icon: TrendingDown, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800', title: 'Bom momento para carregar' },
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
            {(window.avgPrice * 100).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">cênt/kWh</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Mín: <strong className="text-green-600">{(minPrice * 100).toFixed(2)}¢</strong></span>
        <span>Média: <strong>{(avgPrice * 100).toFixed(2)}¢</strong></span>
        <span>Máx: <strong className="text-red-600">{(maxPrice * 100).toFixed(2)}¢</strong></span>
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
