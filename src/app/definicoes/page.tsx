'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadSettings, saveSettings } from '@/lib/settings'
import { getUser } from '@/lib/supabase'
import { TariffSettings, DEFAULT_SETTINGS, TariffOption, TAR_PRESETS, TARIFF_OPTION_LABELS, deriveTariffOption } from '@/lib/tariff'
import { OPERATORS, getOperatorByName } from '@/lib/operators'
import FormulaModal from '@/components/FormulaModal'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { ArrowLeft, Save, RotateCcw, Info } from 'lucide-react'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

function NumInput({ value, onChange, step = 0.0001, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function Toggle({ value, options, onChange }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
            value === o.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const dinamicos = OPERATORS.filter(o => o.type === 'quarto-horario')
const medios = OPERATORS.filter(o => o.type === 'media')

const isHighPower = (opt: TariffOption) => opt === 'tri-high-diario' || opt === 'tri-high-semanal'
const isTri = (opt: TariffOption) => opt.startsWith('tri')
const isBi = (opt: TariffOption) => opt.startsWith('bi')

export default function Definicoes() {
  const [s, setS] = useState<TariffSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showFormula, setShowFormula] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getUser().then(u => {
      if (!u) { router.replace('/login'); return }
      setAuthChecked(true)
      loadSettings().then(setS)
    })
  }, [router])

  const update = (key: keyof TariffSettings, value: unknown) =>
    setS(prev => ({ ...prev, [key]: value }))

  const handleTariffOption = (opt: TariffOption) => {
    const tar = TAR_PRESETS[opt]
    const type = isTri(opt) ? 'tri-horario' : 'bi-horario'
    const cycle = opt.endsWith('semanal') ? 'semanal' : 'diario'
    setS(prev => ({
      ...prev,
      tariffOption: opt,
      type,
      cycle,
      ...tar,
    }))
  }

  const handleOperator = (name: string) => {
    const op = getOperatorByName(name)
    if (op) {
      setS(prev => ({
        ...prev,
        operator: name,
        adequacyFactor: op.adequacyFactor,
        innerCosts: op.innerCosts,
        margin: op.margin,
        tse: op.tse,
        go: op.go,
        mfrr: op.mfrr,
      }))
    } else {
      setS(prev => ({ ...prev, operator: name }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const toSave: TariffSettings = {
      ...s,
      type: isTri(s.tariffOption) ? 'tri-horario' : 'bi-horario',
      cycle: deriveTariffOption(isTri(s.tariffOption) ? 'tri-horario' : 'bi-horario', s.tariffOption.endsWith('semanal') ? 'semanal' : 'diario').endsWith('semanal') ? 'semanal' : 'diario',
    }
    await saveSettings(toSave)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!authChecked) return null

  const currentOperator = getOperatorByName(s.operator)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft size={20} />
            </Link>
            <Logo size={26} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save size={14} />
            {saved ? 'Guardado!' : saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </header>

      <main id="main-content" className="max-w-lg mx-auto px-4 py-4 space-y-4 has-bottom-nav">


        {/* Operador */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Operador</h2>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Operador comercial
              </label>
              {currentOperator && (
                <button
                  onClick={() => setShowFormula(true)}
                  aria-label="Ver fórmula de cálculo do operador"
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Info size={13} />
                  Ver fórmula
                </button>
              )}
            </div>
            <select
              value={s.operator}
              onChange={e => handleOperator(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Dinâmicos (Quarto-Horário)">
                {dinamicos.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </optgroup>
              <optgroup label="Média Mensal">
                {medios.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </optgroup>
            </select>
            {currentOperator && (
              <p className="text-xs text-gray-400">
                {currentOperator.company}
                {currentOperator.type === 'media' && ' · ⚠️ Tarifa média — otimização horária tem menor impacto na fatura'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400 mb-0.5">F. Adequação</div>
              <div className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">{(s.adequacyFactor ?? 1).toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400 mb-0.5">Custos sist.</div>
              <div className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">{((s.innerCosts ?? 0) * 1000).toFixed(1)} m€</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400 mb-0.5">Margem</div>
              <div className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">{(s.margin * 1000).toFixed(1)} m€</div>
            </div>
          </div>

          <Field label="Margem total (€/kWh)" hint="Ajusta se diferente do teu contrato">
            <NumInput value={s.margin} onChange={v => update('margin', v)} />
          </Field>
        </div>

        {/* Opção Horária */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Opção Horária e Ciclo</h2>

          <Field label="Tipo de tarifário">
            <select
              value={s.tariffOption}
              onChange={e => handleTariffOption(e.target.value as TariffOption)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(TARIFF_OPTION_LABELS) as TariffOption[]).map(opt => (
                <option key={opt} value={opt}>{TARIFF_OPTION_LABELS[opt]}</option>
              ))}
            </select>
          </Field>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {s.tariffOption === 'simples' && (
              <p>Tarifa única — o mesmo custo por kWh a qualquer hora do dia.</p>
            )}
            {isBi(s.tariffOption) && (
              <>
                <p><span className="font-semibold text-green-600">Vazio</span>&nbsp;
                  {s.tariffOption === 'bi-semanal'
                    ? '22h–08h (dias úteis) + fim de semana todo'
                    : '22h–08h (todos os dias)'}
                </p>
                <p><span className="font-semibold text-orange-500">Fora de Vazio</span>&nbsp;
                  {s.tariffOption === 'bi-semanal' ? '08h–22h (dias úteis)' : '08h–22h (todos os dias)'}
                </p>
              </>
            )}
            {isTri(s.tariffOption) && !isHighPower(s.tariffOption) && (
              <>
                <p className="font-medium text-gray-700 dark:text-gray-300">Dias úteis:</p>
                <p><span className="font-semibold text-green-600">Vazio</span> 00h–08h e 22h–24h</p>
                <p><span className="font-semibold text-amber-600">Cheia</span> 08h–10h, 13h–19h, 21h–22h</p>
                <p><span className="font-semibold text-red-600">Ponta</span> 10h–13h e 19h–21h</p>
                <p className="text-gray-400">
                  {s.tariffOption === 'tri-diario'
                    ? 'Sáb/Dom/Feriados: Vazio 00h–09h, Cheia 09h–22h'
                    : 'Sáb/Dom/Feriados: Vazio todo o dia'}
                </p>
              </>
            )}
            {isHighPower(s.tariffOption) && (
              <>
                <p className="font-medium text-gray-700 dark:text-gray-300">Dias úteis (BTN &gt;20.7 kVA):</p>
                <p><span className="font-semibold text-green-600">Vazio</span> 00h–08h e 22h–24h</p>
                <p><span className="font-semibold text-amber-600">Cheia</span> 08h–10h, 12h–19h, 22h</p>
                <p><span className="font-semibold text-red-600">Ponta</span> 10h–12h e 19h–22h <span className="text-gray-400">(ERSE: 9h30–12h e 18h30–21h30)</span></p>
                <p className="text-gray-400">
                  {s.tariffOption === 'tri-high-diario'
                    ? 'Sáb/Dom/Feriados: Vazio 00h–09h, Cheia 09h–22h'
                    : 'Sáb/Dom/Feriados: Vazio todo o dia'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* TAR */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">TAR — Acesso às Redes 2026</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isHighPower(s.tariffOption) ? 'BTN >20.7 kVA' : 'BTN ≤20.7 kVA'}
              </p>
            </div>
            <button
              onClick={() => setS(prev => ({ ...prev, ...TAR_PRESETS[prev.tariffOption] }))}
              aria-label="Repor valores TAR predefinidos"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RotateCcw size={11} /> Repor
            </button>
          </div>

          {s.tariffOption === 'simples' ? (
            <Field label="TAR Simples (€/kWh)">
              <NumInput value={s.tarForaVazio} onChange={v => setS(prev => ({
                ...prev, tarForaVazio: v, tarVazio: v, tarCheia: v, tarPonta: v,
              }))} />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vazio (€/kWh)">
                <NumInput value={s.tarVazio} onChange={v => update('tarVazio', v)} />
              </Field>
              {isBi(s.tariffOption) ? (
                <Field label="Fora de Vazio (€/kWh)">
                  <NumInput value={s.tarForaVazio} onChange={v => update('tarForaVazio', v)} />
                </Field>
              ) : (
                <>
                  <Field label="Cheia (€/kWh)">
                    <NumInput value={s.tarCheia} onChange={v => update('tarCheia', v)} />
                  </Field>
                  <Field label="Ponta (€/kWh)">
                    <NumInput value={s.tarPonta} onChange={v => update('tarPonta', v)} />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>

        {/* Impostos e Perdas */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Impostos e Perdas</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="IVA" hint="0.23 = 23%">
              <NumInput value={s.iva} onChange={v => update('iva', v)} step={0.01} />
            </Field>
            <Field label="IESPE (€/kWh)">
              <NumInput value={s.iespe} onChange={v => update('iespe', v)} />
            </Field>
            <Field label="Perdas rede" hint="0.03 = 3%">
              <NumInput value={s.lossCoeff} onChange={v => update('lossCoeff', v)} step={0.001} />
            </Field>
          </div>
        </div>

        <div className="pb-4" />
      </main>

      {showFormula && currentOperator && (
        <FormulaModal
          operator={currentOperator}
          settings={s}
          onClose={() => setShowFormula(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
