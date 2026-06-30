'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Bar, BarChart,
} from 'recharts'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, Period } from '@/lib/tariff'

interface DataPoint {
  hour: string
  omie: number
  total: number
  period: Period
  isOptimal: boolean
}

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
}

const PERIOD_COLORS: Record<Period, string> = {
  'vazio': '#16a34a',
  'fora-vazio': '#ea580c',
  'ponta': '#dc2626',
  'cheia': '#d97706',
}

const PERIOD_LABELS: Record<Period, string> = {
  'vazio': 'Vazio',
  'fora-vazio': 'Fora de Vazio',
  'ponta': 'Ponta',
  'cheia': 'Cheia',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DataPoint
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{label}h</p>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ background: PERIOD_COLORS[d.period] }}
        />
        <span className="text-gray-500 dark:text-gray-400">{PERIOD_LABELS[d.period]}</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300">OMIE: <span className="font-medium">{d.omie.toFixed(1)} €/MWh</span></p>
      <p className="text-gray-700 dark:text-gray-300">Total c/ impostos: <span className="font-bold text-blue-600 dark:text-blue-400">{(d.total * 100).toFixed(2)} cênt/kWh</span></p>
      {d.isOptimal && <p className="text-green-600 dark:text-green-400 font-semibold mt-1">✓ Ótimo para carregar</p>}
    </div>
  )
}

export default function PriceChart({ prices, settings, date }: Props) {
  if (!prices.length) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Sem dados de preços disponíveis
    </div>
  )

  const data: DataPoint[] = prices
    .sort((a, b) => a.hour - b.hour)
    .map(p => {
      const period = getPeriodForHour(p.hour, settings, date)
      const total = calcPrice(p.price, period, settings)
      return {
        hour: String(p.hour).padStart(2, '0'),
        omie: p.price,
        total,
        period,
        isOptimal: false,
      }
    })

  // Marcar as 6 horas mais baratas como ótimas
  const sorted = [...data].sort((a, b) => a.total - b.total)
  const threshold = sorted[5]?.total ?? 0
  data.forEach(d => { d.isOptimal = d.total <= threshold })

  const avgPrice = data.reduce((s, d) => s + d.total, 0) / data.length

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={v => `${v}h`}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={v => `${(v * 100).toFixed(0)}¢`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgPrice}
            stroke="#6b7280"
            strokeDasharray="4 2"
            label={{ value: 'média', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isOptimal ? '#16a34a' : PERIOD_COLORS[entry.period]}
                opacity={entry.isOptimal ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />
          Ótimo para carregar
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-orange-600 opacity-60 inline-block" />
          Fora de Vazio
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-green-600 opacity-60 inline-block" />
          Vazio
        </div>
        {settings.type === 'tri-horario' && <>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-amber-600 opacity-60 inline-block" />
            Cheia
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-red-600 opacity-60 inline-block" />
            Ponta
          </div>
        </>}
      </div>
    </div>
  )
}
