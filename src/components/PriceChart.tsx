'use client'

import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend,
} from 'recharts'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow, Period } from '@/lib/tariff'

interface DataPoint {
  slot: number
  hour: number
  omie: number      // €/MWh (para tooltip)
  omieKwh: number   // €/kWh (= omie/1000 — custo bruto mercado)
  total: number     // €/kWh (custo real com TAR + margem + IVA + IESPE)
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

function slotToTime(slot: number): string {
  const h = Math.floor(slot / 4)
  const m = (slot % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DataPoint
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs min-w-[190px]">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
        {slotToTime(d.slot)} – {slotToTime(d.slot + 1)}
      </p>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: PERIOD_BG[d.period] }} />
        <span className="text-gray-500">{PERIOD_NAMES[d.period]}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="inline-block w-2 h-2 rounded-sm bg-slate-400 opacity-70" />
            OMIE (mercado)
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
            {d.omie.toFixed(2)} €/MWh
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="inline-block w-2 h-2 rounded-sm bg-blue-500" />
            Custo final
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {d.total.toFixed(4)} €/kWh
          </span>
        </div>
        <div className="pt-1 border-t border-gray-100 dark:border-gray-700 flex justify-between text-[10px] text-gray-400">
          <span>TAR + margem + IVA</span>
          <span className="tabular-nums">+{((d.total - d.omieKwh) * 1000).toFixed(2)} m€/kWh</span>
        </div>
      </div>
      {d.isOptimal && (
        <p className="text-green-600 dark:text-green-400 font-semibold mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          ✓ Bom período para carregar
        </p>
      )}
    </div>
  )
}

function groupPeriodBlocks(data: DataPoint[]): PeriodBlock[] {
  if (!data.length) return []
  const blocks: PeriodBlock[] = []
  let current: PeriodBlock = { period: data[0].period, start: 0, end: 0 }
  for (let i = 1; i < data.length; i++) {
    if (data[i].period !== current.period) {
      blocks.push({ ...current })
      current = { period: data[i].period, start: i, end: i }
    } else {
      current.end = i
    }
  }
  blocks.push(current)
  return blocks
}

function buildSlotData(
  prices: OmiePrice[],
  settings: TariffSettings,
  date: Date,
  optimalHours: number[]
): DataPoint[] {
  const hourMap = new Map(prices.map(p => [p.hour, p.price]))
  return Array.from({ length: 96 }, (_, slot) => {
    const hour = Math.floor(slot / 4)
    const fraction = (slot % 4) / 4
    const priceA = hourMap.get(hour) ?? 0
    const priceB = hourMap.get(hour + 1) ?? priceA
    const omie = priceA + (priceB - priceA) * fraction
    const omieKwh = omie / 1000
    const period = getPeriodForHour(hour, settings, date)
    const total = calcPrice(omie, period, settings)
    return { slot, hour, omie, omieKwh, total, period, isOptimal: optimalHours.includes(hour) }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLegend = () => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
    <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
      <span className="inline-block w-8 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600 opacity-80" />
      Preço OMIE (mercado)
    </span>
    <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
      <span className="inline-block w-8 h-0.5 bg-blue-500 rounded" />
      Custo final (com TAR + IVA)
    </span>
  </div>
)

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

  const window = findOptimalWindow(
    prices.map(p => ({ hour: p.hour, price: p.price })),
    settings,
    date
  )
  const optimalHours = window?.hours ?? []
  const data = buildSlotData(prices, settings, date, optimalHours)
  const periodBlocks = groupPeriodBlocks(data)

  // Domínio Y cobre tanto omieKwh como total
  const allValues = data.flatMap(d => [d.total, d.omieKwh]).filter(v => v > 0)
  const maxVal = Math.max(...allValues)
  const minVal = Math.min(...allValues)
  const yPad = (maxVal - minVal) * 0.12
  const yMin = Math.max(0, minVal - yPad)
  const yMax = maxVal + yPad

  const isToday = date.toDateString() === new Date().toDateString()
  const now = new Date()
  const currentSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15)

  return (
    <div className="w-full space-y-0">
      {isMock && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
          ⚠️ Dados OMIE estimados — preços reais ainda não disponíveis
        </p>
      )}

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="omieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="optimalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />

          <XAxis
            dataKey="slot"
            type="number"
            domain={[0, 95]}
            ticks={[0, 16, 32, 48, 64, 80, 95]}
            tickFormatter={slotToTime}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={v => `${v.toFixed(3)}€`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Fundo subtil por período */}
          {periodBlocks.map((block, i) => (
            <ReferenceArea
              key={i}
              x1={block.start}
              x2={block.end}
              fill={PERIOD_BG[block.period]}
              fillOpacity={0.04}
              stroke="none"
            />
          ))}

          {/* Overlay verde — janela ótima */}
          {window && (
            <ReferenceArea
              x1={window.startHour * 4}
              x2={window.endHour * 4 - 1}
              fill="url(#optimalGradient)"
              stroke="#16a34a"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="5 3"
            />
          )}

          {/* Hora actual */}
          {isToday && (
            <ReferenceLine
              x={currentSlot}
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}

          {/* Área cinza — preço OMIE bruto (€/kWh) */}
          <Area
            type="monotone"
            dataKey="omieKwh"
            stroke="#94a3b8"
            strokeWidth={0}
            fill="url(#omieGradient)"
            dot={false}
            activeDot={false}
            legendType="none"
          />

          {/* Linha azul — custo final ao consumidor (€/kWh) */}
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
            legendType="none"
          />

          <Legend content={<CustomLegend />} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Faixa de períodos */}
      <div className="flex h-6 overflow-hidden rounded-b-xl border-t border-gray-100 dark:border-gray-800">
        {periodBlocks.map((block, i) => {
          const width = (block.end - block.start + 1) / 96 * 100
          return (
            <div
              key={i}
              style={{ width: `${width}%`, background: PERIOD_BG[block.period] }}
              className="flex items-center justify-center overflow-hidden"
            >
              <span className="text-white text-[9px] font-semibold truncate px-1 opacity-90">
                {block.end - block.start >= 11 ? PERIOD_NAMES[block.period] : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legenda de períodos + janela ótima */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {Object.entries(PERIOD_NAMES).map(([key, label]) => {
          if (!periodBlocks.some(b => b.period === key)) return null
          return (
            <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: PERIOD_BG[key as Period] }} />
              {label}
            </span>
          )
        })}
        {window && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-sm inline-block opacity-50 border border-dashed border-green-600 bg-green-600" />
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
