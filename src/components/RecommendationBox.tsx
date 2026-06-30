'use client'

import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour } from '@/lib/tariff'
import { Zap, TrendingDown, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
  label: string
}

interface Window {
  startHour: number
  endHour: number
  avgPrice: number
  avgOmie: number
}

function findBestWindows(prices: OmiePrice[], settings: TariffSettings, date: Date, windowSize = 4): Window[] {
  const sorted = [...prices].sort((a, b) => a.hour - b.hour)
  const windows: Window[] = []

  for (let start = 0; start <= 24 - windowSize; start++) {
    const slice = sorted.filter(p => p.hour >= start && p.hour < start + windowSize)
    if (slice.length < windowSize) continue
    const avgPrice = slice.reduce((s, p) => {
      const period = getPeriodForHour(p.hour, settings, date)
      return s + calcPrice(p.price, period, settings)
    }, 0) / slice.length
    const avgOmie = slice.reduce((s, p) => s + p.price, 0) / slice.length
    windows.push({ startHour: start, endHour: start + windowSize, avgPrice, avgOmie })
  }

  return windows.sort((a, b) => a.avgPrice - b.avgPrice).slice(0, 3)
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

export default function RecommendationBox({ prices, settings, date, label }: Props) {
  if (!prices.length) return null

  const windows = findBestWindows(prices, settings, date)
  const best = windows[0]
  const allPrices = prices.map(p => {
    const period = getPeriodForHour(p.hour, settings, date)
    return calcPrice(p.price, period, settings)
  })
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const avgPrice = allPrices.reduce((s, v) => s + v, 0) / allPrices.length
  const classification = classify(best.avgPrice)

  const savingsVsMax = ((maxPrice - best.avgPrice) * 22).toFixed(2) // para um Leaf ~22kWh

  const messages: Record<string, { icon: typeof Zap; color: string; bg: string; title: string; text: string }> = {
    'muito-barato': {
      icon: Zap,
      color: 'text-green-700 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      title: 'Energia muito barata!',
      text: `${label}, o melhor horário para carregar é das ${fmt(best.startHour)} às ${fmt(best.endHour)} com preço médio de ${(best.avgPrice * 100).toFixed(1)} cênt/kWh. Podes poupar ~${savingsVsMax}€ vs. carregar no pior horário.`,
    },
    'barato': {
      icon: TrendingDown,
      color: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      title: 'Bom momento para carregar',
      text: `${label}, carrega entre as ${fmt(best.startHour)} e as ${fmt(best.endHour)}. Preço médio estimado: ${(best.avgPrice * 100).toFixed(1)} cênt/kWh. Poupança potencial: ~${savingsVsMax}€.`,
    },
    'normal': {
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
      title: 'Preços moderados',
      text: `${label}, o melhor horário é das ${fmt(best.startHour)} às ${fmt(best.endHour)} (${(best.avgPrice * 100).toFixed(1)} cênt/kWh). Considera adiar se não for urgente.`,
    },
    'caro': {
      icon: AlertTriangle,
      color: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
      title: 'Energia cara hoje',
      text: `${label} os preços estão elevados. Se possível, adia o carregamento. Melhor opção disponível: ${fmt(best.startHour)}–${fmt(best.endHour)} a ${(best.avgPrice * 100).toFixed(1)} cênt/kWh.`,
    },
  }

  const msg = messages[classification]
  const Icon = msg.icon

  return (
    <div className={`rounded-2xl border p-4 ${msg.bg}`}>
      <div className={`flex items-center gap-2 font-semibold mb-2 ${msg.color}`}>
        <Icon size={18} />
        {msg.title}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{msg.text}</p>

      <div className="grid grid-cols-3 gap-2">
        {windows.map((w, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-2.5 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">#{i + 1} opção</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              {fmt(w.startHour)}–{fmt(w.endHour)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {(w.avgPrice * 100).toFixed(1)} ¢/kWh
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <span>Mín: <strong className="text-green-600">{(minPrice * 100).toFixed(1)}¢</strong></span>
        <span>Média: <strong>{(avgPrice * 100).toFixed(1)}¢</strong></span>
        <span>Máx: <strong className="text-red-600">{(maxPrice * 100).toFixed(1)}¢</strong></span>
      </div>
    </div>
  )
}
