'use client'

import { useState } from 'react'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow, getPeriodLabel, TARIFF_OPTION_LABELS } from '@/lib/tariff'
import { Zap, TrendingDown, AlertTriangle, Clock, Info, X } from 'lucide-react'

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
  label: string
}

function fmt(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

// Limiares dinâmicos baseados no tarifário real do utilizador.
// Referência: OMIE = 10, 50, 100 €/MWh em período Fora de Vazio —
// valores que representam pico solar baixo, mercado moderado e mercado caro.
function getThresholds(settings: TariffSettings) {
  return {
    excelente: calcPrice(10,  'fora-vazio', settings),
    bom:       calcPrice(50,  'fora-vazio', settings),
    normal:    calcPrice(100, 'fora-vazio', settings),
  }
}

function classify(price: number, settings: TariffSettings): 'excelente' | 'bom' | 'normal' | 'caro' {
  const t = getThresholds(settings)
  if (price <= t.excelente) return 'excelente'
  if (price <= t.bom)       return 'bom'
  if (price <= t.normal)    return 'normal'
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
  const [showInfo, setShowInfo] = useState(false)

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

  const classification = classify(window.avgPrice, settings)
  const explanation = buildExplanation(prices, settings, date, window)
  const thresholds = getThresholds(settings)

  const ivaLabel = settings.iva > 0
    ? `c/ IVA ${(settings.iva * 100).toFixed(0)}%`
    : 's/ IVA'

  const styles = {
    'excelente': { Icon: Zap,           color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',   title: 'Ótimo para carregar!' },
    'bom':       { Icon: TrendingDown,  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',     title: 'Bom momento para carregar' },
    'normal':    { Icon: Clock,         color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', title: 'Preços moderados' },
    'caro':      { Icon: AlertTriangle, color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',         title: 'Energia cara' },
  }

  const { Icon, color, bg, title } = styles[classification]

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bg}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 font-semibold ${color}`}>
          <Icon size={18} />
          {title}
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          aria-label="Ver critérios de classificação"
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
        >
          {showInfo ? <X size={15} /> : <Info size={15} />}
        </button>
      </div>

      {/* Painel informativo */}
      {showInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Critérios de classificação
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Baseados no teu tarifário <strong className="text-gray-700 dark:text-gray-200">{TARIFF_OPTION_LABELS[settings.tariffOption] ?? settings.tariffOption}</strong> com valores TAR ERSE 2026, margem, perdas e <strong className="text-gray-700 dark:text-gray-200">{ivaLabel}</strong>. Os limiares são calculados para OMIE de referência em período Fora de Vazio.
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Ótimo para carregar', color: 'text-green-600', threshold: `≤ ${thresholds.excelente.toFixed(4)} €/kWh`, ref: 'OMIE ≤ 10 €/MWh (pico solar baixo)' },
              { label: 'Bom momento',         color: 'text-blue-600',  threshold: `≤ ${thresholds.bom.toFixed(4)} €/kWh`,       ref: 'OMIE ≤ 50 €/MWh' },
              { label: 'Preços moderados',    color: 'text-amber-600', threshold: `≤ ${thresholds.normal.toFixed(4)} €/kWh`,     ref: 'OMIE ≤ 100 €/MWh' },
              { label: 'Energia cara',        color: 'text-red-600',   threshold: `> ${thresholds.normal.toFixed(4)} €/kWh`,     ref: 'OMIE > 100 €/MWh' },
            ].map((row, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`shrink-0 font-medium ${row.color}`}>{row.label}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-gray-700 dark:text-gray-300">{row.threshold}</span>
                  <span className="block text-[10px] text-gray-400">{row.ref}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed pt-1 border-t border-gray-100 dark:border-gray-700">
            Os limiares actualizam-se automaticamente se alterares o tarifário ou o toggle de IVA.
          </p>
        </div>
      )}

      {/* Janela ótima */}
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
