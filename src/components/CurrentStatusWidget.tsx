'use client'

import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow } from '@/lib/tariff'
import { Zap, ZapOff, Clock } from 'lucide-react'

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
}

function fmt(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

export default function CurrentStatusWidget({ prices, settings }: Props) {
  if (!prices.length) return null

  const now = new Date()
  const currentHour = now.getHours()
  const date = new Date()

  const window = findOptimalWindow(
    prices.map(p => ({ hour: p.hour, price: p.price })),
    settings,
    date
  )

  const currentPrice = prices.find(p => p.hour === currentHour)
  const currentTotal = currentPrice
    ? calcPrice(currentPrice.price, getPeriodForHour(currentHour, settings, date), settings)
    : null

  const isGoodNow = window ? window.hours.includes(currentHour) : false
  const goodUntilArr = window && isGoodNow
    ? window.hours.filter(h => h >= currentHour).sort((a, b) => a - b)
    : []
  const goodUntil = goodUntilArr.length > 0 ? goodUntilArr[goodUntilArr.length - 1] : null

  const nextGoodStart = window && !isGoodNow
    ? window.hours.find(h => h > currentHour) ?? window.startHour
    : null

  return (
    <div className={`rounded-2xl p-4 flex items-center gap-4 ${
      isGoodNow
        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
        : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
        isGoodNow ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-600'
      }`}>
        {isGoodNow
          ? <Zap size={22} className="text-white" />
          : <ZapOff size={22} className="text-white" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400">Agora — {fmt(currentHour)}</span>
        </div>

        {isGoodNow ? (
          <>
            <p className="font-semibold text-green-800 dark:text-green-200 text-sm leading-tight">
              Boa hora para carregar!
            </p>
            {goodUntil !== null && (
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                Aproveita até às {fmt(goodUntil + 1)}
                {currentTotal && ` · ${currentTotal.toFixed(4)} €/kWh`}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm leading-tight">
              Não é boa hora para carregar
            </p>
            {nextGoodStart !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Próximo período barato: {fmt(nextGoodStart)}
                {window && ` – ${fmt(window.endHour)}`}
              </p>
            )}
          </>
        )}
      </div>

      {currentTotal && (
        <div className="text-right shrink-0">
          <div className={`text-lg font-bold ${isGoodNow ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
            {currentTotal.toFixed(4)}
          </div>
          <div className="text-xs text-gray-400">€/kWh</div>
        </div>
      )}
    </div>
  )
}
