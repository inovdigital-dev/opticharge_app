'use client'

import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Cell,
} from 'recharts'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow } from '@/lib/tariff'

interface DataPoint {
  hour: string
  hourNum: number
  omie: number
  total: number
  isOptimal: boolean
}

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
}

function priceColor(total: number, min: number, max: number): string {
  const ratio = max === min ? 0 : (total - min) / (max - min)
  if (ratio < 0.33) return '#16a34a'
  if (ratio < 0.66) return '#f59e0b'
  return '#dc2626'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DataPoint
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{d.hour}:00 – {String(d.hourNum + 1).padStart(2, '0')}:00</p>
      <p className="text-gray-500 dark:text-gray-400">OMIE: <span className="font-medium text-gray-700 dark:text-gray-300">{d.omie.toFixed(2)} €/MWh</span></p>
      <p className="text-gray-500 dark:text-gray-400">Custo total: <span className="font-bold text-blue-600 dark:text-blue-400">{d.total.toFixed(4)} €/kWh</span></p>
      {d.isOptimal && <p className="text-green-600 dark:text-green-400 font-semibold mt-1">✓ Ótimo para carregar</p>}
    </div>
  )
}

export default function PriceChart({ prices, settings, date }: Props) {
  if (!prices.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sem dados disponíveis</div>
  )

  const sorted = [...prices].sort((a, b) => a.hour - b.hour)
  const data: DataPoint[] = sorted.map(p => {
    const period = getPeriodForHour(p.hour, settings, date)
    const total = calcPrice(p.price, period, settings)
    return { hour: String(p.hour).padStart(2, '0'), hourNum: p.hour, omie: p.price, total, isOptimal: false }
  })

  const totals = data.map(d => d.total)
  const minTotal = Math.min(...totals)
  const maxTotal = Math.max(...totals)

  const window = findOptimalWindow(sorted.map(p => ({ hour: p.hour, price: p.price })), settings, date)
  if (window) data.forEach(d => { d.isOptimal = window.hours.includes(d.hourNum) })

  const avgTotal = totals.reduce((s, v) => s + v, 0) / totals.length
  const currentHour = new Date().getHours()
  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={v => `${v}h`}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={v => `${v.toFixed(2)}€`}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zona verde de carregamento ótimo */}
          {window && (
            <ReferenceArea
              x1={String(window.startHour).padStart(2, '0')}
              x2={String(window.endHour - 1).padStart(2, '0')}
              fill="#16a34a"
              fillOpacity={0.12}
              stroke="#16a34a"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          )}

          {/* Linha de média */}
          <ReferenceLine
            y={avgTotal}
            stroke="#6b7280"
            strokeDasharray="4 2"
            strokeWidth={1}
          />

          {/* Hora atual */}
          {isToday && (
            <ReferenceLine
              x={String(currentHour).padStart(2, '0')}
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}

          <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isOptimal ? '#16a34a' : priceColor(entry.total, minTotal, maxTotal)}
                opacity={entry.isOptimal ? 1 : 0.75}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block" />Barato / ótimo</span>
        <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />Moderado</span>
        <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />Caro</span>
        {isToday && <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-0.5 h-3 bg-blue-600 inline-block rounded-full" />Agora</span>}
      </div>
    </div>
  )
}
