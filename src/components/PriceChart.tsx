'use client'

import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts'
import { OmiePrice } from '@/lib/omie'
import { TariffSettings, calcPrice, getPeriodForHour, findOptimalWindow, Period } from '@/lib/tariff'

interface DataPoint {
  slot: number
  hour: number
  omie: number      // €/MWh (tooltip)
  omieKwh: number   // €/kWh (linha de referência)
  total: number     // €/kWh custo final ao consumidor
  period: Period
  isOptimal: boolean
}

// 3 cores: verde = abaixo da média, laranja = ±10% da média, vermelho = acima da média
const BAR_COLORS = { low: '#16a34a', mid: '#f97316', high: '#ef4444' }
const BAR_LABELS = [
  { color: BAR_COLORS.low, label: 'Abaixo da média' },
  { color: BAR_COLORS.mid, label: '±10% da média' },
  { color: BAR_COLORS.high, label: 'Acima da média' },
]

function getBarColor(total: number, mean: number): string {
  if (total < mean * 0.90) return BAR_COLORS.low
  if (total <= mean * 1.10) return BAR_COLORS.mid
  return BAR_COLORS.high
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
        [{slotToTime(d.slot)} – {slotToTime(d.slot + 1)}[
      </p>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: PERIOD_BG[d.period] }} />
        <span className="text-gray-500">{PERIOD_NAMES[d.period]}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">OMIE (mercado)</span>
          <span className="font-medium tabular-nums text-gray-600 dark:text-gray-400">{d.omieKwh.toFixed(4)} €/kWh</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Custo final</span>
          <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{d.total.toFixed(4)} €/kWh</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400">
          <span>TAR + margem + IVA</span>
          <span className="tabular-nums">+{(d.total - d.omieKwh).toFixed(4)} €/kWh</span>
        </div>
      </div>
      {d.isOptimal && (
        <p className="text-green-600 dark:text-green-400 font-semibold mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          ✓ Ótimo para carregar
        </p>
      )}
    </div>
  )
}

function groupPeriodBlocks(data: DataPoint[]): { period: Period; start: number; end: number }[] {
  if (!data.length) return []
  const blocks: { period: Period; start: number; end: number }[] = []
  let cur = { period: data[0].period, start: 0, end: 0 }
  for (let i = 1; i < data.length; i++) {
    if (data[i].period !== cur.period) {
      blocks.push({ ...cur })
      cur = { period: data[i].period, start: i, end: i }
    } else {
      cur.end = i
    }
  }
  blocks.push(cur)
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
    const omieKwh = Math.max(0, omie / 1000)
    const period = getPeriodForHour(hour, settings, date)
    const total = calcPrice(omie, period, settings)
    return { slot, hour, omie, omieKwh, total, period, isOptimal: optimalHours.includes(hour) }
  })
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

  const optWindow = findOptimalWindow(
    prices.map(p => ({ hour: p.hour, price: p.price })),
    settings,
    date
  )
  const optimalHours = optWindow?.hours ?? []
  const data = buildSlotData(prices, settings, date, optimalHours)
  const periodBlocks = groupPeriodBlocks(data)

  // Média do custo final para coloração das barras
  const mean = data.reduce((s, d) => s + d.total, 0) / data.length

  const yMax = Math.max(...data.map(d => d.total)) * 1.08
  const hourTicks = Array.from({ length: 13 }, (_, i) => i * 8) // a cada 2h

  const isToday = date.toDateString() === new Date().toDateString()
  const now = new Date()
  const currentSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15)

  // Calcular grupos de slots ótimos para ReferenceArea
  const optimalSlotRanges: { x1: number; x2: number }[] = []
  if (optimalHours.length > 0) {
    const slotsSorted = optimalHours.flatMap(h => [h * 4, h * 4 + 3]).sort((a, b) => a - b)
    let rangeStart = slotsSorted[0]
    let rangeEnd = slotsSorted[0]
    for (let i = 1; i < slotsSorted.length; i++) {
      if (slotsSorted[i] <= rangeEnd + 4) {
        rangeEnd = slotsSorted[i]
      } else {
        optimalSlotRanges.push({ x1: rangeStart, x2: rangeEnd })
        rangeStart = slotsSorted[i]
        rangeEnd = slotsSorted[i]
      }
    }
    optimalSlotRanges.push({ x1: rangeStart, x2: rangeEnd })
  }

  return (
    <div className="w-full" style={{ overflow: 'hidden' }}>
      {isMock && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
          ⚠️ Dados OMIE estimados — preços reais ainda não disponíveis
        </p>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 6, right: 4, left: -4, bottom: 0 }} barCategoryGap={0} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />

          <XAxis
            dataKey="slot"
            type="number"
            domain={[0, 95]}
            ticks={hourTicks}
            tickFormatter={slotToTime}
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            interval={0}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={v => `${v.toFixed(2)}€`}
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Fundo verde nos períodos ótimos */}
          {optimalSlotRanges.map((r, i) => (
            <ReferenceArea
              key={i}
              x1={r.x1}
              x2={r.x2}
              fill="rgba(22,163,74,0.13)"
              stroke="#16a34a"
              strokeOpacity={0.45}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          ))}

          {/* Linha da hora atual */}
          {isToday && (
            <ReferenceLine
              x={currentSlot}
              stroke="#2563eb"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}

          {/* Barras = preço OMIE bruto (€/kWh), coloridas pela relação com a média do dia */}
          <Bar dataKey="omieKwh" isAnimationActive={false} maxBarSize={8}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={getBarColor(entry.total, mean)}
                fillOpacity={entry.isOptimal ? 1 : 0.78}
              />
            ))}
          </Bar>

          {/* Linha azul = custo final ao consumidor (OMIE + perdas + margem + TAR + IVA + IESPE) */}
          <Line
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Faixa de períodos — offset para alinhar com a área de plotagem (YAxis=44px, margin-left=-4) */}
      <div className="flex h-5 overflow-hidden border-t border-gray-100 dark:border-gray-800">
        <div style={{ width: 40, flexShrink: 0 }} /> {/* espaço do YAxis */}
        <div className="flex flex-1 overflow-hidden">
          {periodBlocks.map((block, i) => {
            const width = (block.end - block.start + 1) / 96 * 100
            return (
              <div
                key={i}
                style={{ width: `${width}%`, flexShrink: 0, background: PERIOD_BG[block.period] }}
                className="flex items-center justify-center overflow-hidden"
              >
                <span className="text-white text-[8px] font-semibold truncate px-0.5 opacity-90">
                  {block.end - block.start >= 15 ? PERIOD_NAMES[block.period] : ''}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ width: 4, flexShrink: 0 }} /> {/* espaço da margem direita */}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {BAR_LABELS.map((item, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="inline-block w-5 border-t-2 border-blue-500" />
          Custo final €/kWh
        </span>
        {optWindow && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-green-600 opacity-50" />
            Ótimo p/ carregar
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
