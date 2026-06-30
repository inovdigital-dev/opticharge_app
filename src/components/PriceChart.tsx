'use client'

import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow, Period } from '@/lib/tariff'

interface DataPoint {
  hour: number   // 0-23 (numérico para recharts)
  omie: number   // €/MWh
  total: number  // €/kWh (custo final ao consumidor)
  period: Period
  isOptimal: boolean
}

interface PeriodBlock {
  period: Period
  start: number
  end: number
}

const PERIOD_BG: Record<Period, string> = {
  'vazio': '#16a34a',
  'fora-vazio': '#f97316',
  'ponta': '#dc2626',
  'cheia': '#d97706',
}

const PERIOD_NAMES: Record<Period, string> = {
  'vazio': 'Vazio',
  'fora-vazio': 'Fora de Vazio',
  'ponta': 'Ponta',
  'cheia': 'Cheia',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DataPoint
  const h = String(d.hour).padStart(2, '0')
  const hNext = String(d.hour + 1).padStart(2, '0')
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5">{h}:00 – {hNext}:00</p>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: PERIOD_BG[d.period] }} />
        <span className="text-gray-500">{PERIOD_NAMES[d.period]}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        OMIE: <span className="font-medium text-gray-800 dark:text-gray-200">{d.omie.toFixed(2)} €/MWh</span>
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Custo total: <span className="font-bold text-blue-600 dark:text-blue-400">{(d.total * 100).toFixed(3)} cênt/kWh</span>
      </p>
      {d.isOptimal && (
        <p className="text-green-600 dark:text-green-400 font-semibold mt-1.5 flex items-center gap-1">
          ✓ Bom período para carregar
        </p>
      )}
    </div>
  )
}

function groupPeriodBlocks(data: DataPoint[]): PeriodBlock[] {
  if (!data.length) return []
  const blocks: PeriodBlock[] = []
  let current: PeriodBlock = { period: data[0].period, start: data[0].hour, end: data[0].hour }

  for (let i = 1; i < data.length; i++) {
    if (data[i].period !== current.period) {
      blocks.push({ ...current })
      current = { period: data[i].period, start: data[i].hour, end: data[i].hour }
    } else {
      current.end = data[i].hour
    }
  }
  blocks.push(current)
  return blocks
}

interface Props {
  prices: OmiePrice[]
  settings: TariffSettings
  date: Date
  isMock?: boolean
}

export default function PriceChart({ prices, settings, date, isMock }: Props) {
  if (!prices.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sem dados disponíveis</div>
  )

  // Construir dados hora a hora (0-23)
  const hourMap = new Map(prices.map(p => [p.hour, p.price]))
  const data: DataPoint[] = Array.from({ length: 24 }, (_, hour) => {
    const omie = hourMap.get(hour) ?? 0
    const period = getPeriodForHour(hour, settings, date)
    const total = calcPrice(omie, period, settings)
    return { hour, omie, total, period, isOptimal: false }
  })

  // Janela ótima
  const window = findOptimalWindow(
    prices.map(p => ({ hour: p.hour, price: p.price })),
    settings,
    date
  )
  if (window) data.forEach(d => { d.isOptimal = window.hours.includes(d.hour) })

  const periodBlocks = groupPeriodBlocks(data)
  const totals = data.map(d => d.total)
  const maxTotal = Math.max(...totals)
  const minTotal = Math.min(...totals)
  const yPad = (maxTotal - minTotal) * 0.15
  const yMin = Math.max(0, minTotal - yPad)
  const yMax = maxTotal + yPad

  const isToday = date.toDateString() === new Date().toDateString()
  const currentHour = new Date().getHours()

  return (
    <div className="w-full space-y-0">
      {isMock && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
          ⚠️ Dados OMIE estimados — preços reais ainda não disponíveis
        </p>
      )}

      {/* Gráfico principal */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="optimalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />

          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 23]}
            ticks={[0, 4, 8, 12, 16, 20, 23]}
            tickFormatter={v => `${String(v).padStart(2, '0')}h`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={v => `${(v * 100).toFixed(1)}¢`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Fundo por período (muito subtil) */}
          {periodBlocks.map((block, i) => (
            <ReferenceArea
              key={i}
              x1={block.start}
              x2={block.end}
              fill={PERIOD_BG[block.period]}
              fillOpacity={0.05}
              stroke="none"
            />
          ))}

          {/* Overlay verde — janela ótima de carregamento */}
          {window && (
            <ReferenceArea
              x1={window.startHour}
              x2={window.endHour - 1}
              fill="url(#optimalGradient)"
              stroke="#16a34a"
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="5 3"
            />
          )}

          {/* Hora atual */}
          {isToday && (
            <ReferenceLine
              x={currentHour}
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}

          {/* Linha/área do custo total */}
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Faixa de períodos */}
      <div className="flex h-7 overflow-hidden rounded-b-xl border-t border-gray-100 dark:border-gray-800 mt-0">
        {periodBlocks.map((block, i) => {
          const width = (block.end - block.start + 1) / 24 * 100
          return (
            <div
              key={i}
              style={{ width: `${width}%`, background: PERIOD_BG[block.period] }}
              className="flex items-center justify-center overflow-hidden"
            >
              <span className="text-white text-[9px] font-semibold truncate px-1 opacity-90">
                {block.end - block.start >= 3 ? PERIOD_NAMES[block.period] : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {Object.entries(PERIOD_NAMES).map(([key, label]) => {
          const hasIt = periodBlocks.some(b => b.period === key)
          if (!hasIt) return null
          return (
            <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: PERIOD_BG[key as Period] }} />
              {label}
            </span>
          )
        })}
        {window && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm inline-block bg-green-600 opacity-50 border border-green-600 border-dashed" />
            Ótimo para carregar
          </span>
        )}
        {isToday && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="inline-block w-3 border-t-2 border-dashed border-blue-500" />
            Agora
          </span>
        )}
      </div>
    </div>
  )
}
