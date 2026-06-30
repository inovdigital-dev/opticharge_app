'use client'

import { useState, useEffect } from 'react'
import { loadSettings, saveSettings } from '@/lib/settings'
import { TariffSettings, DEFAULT_SETTINGS } from '@/lib/tariff'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'

const OPERATORS: { name: string; margin: number }[] = [
  { name: 'G9 Smart Dynamic', margin: 0.0055 },
  { name: 'EDP Comercial Indexado', margin: 0.0050 },
  { name: 'Galp Indexado', margin: 0.0060 },
  { name: 'Endesa Indexado', margin: 0.0048 },
  { name: 'Iberdrola Indexado', margin: 0.0052 },
  { name: 'Personalizado', margin: 0.005 },
]

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

export default function Definicoes() {
  const [s, setS] = useState<TariffSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSettings().then(setS) }, [])

  const update = (key: keyof TariffSettings, value: unknown) =>
    setS(prev => ({ ...prev, [key]: value }))

  const handleOperator = (name: string) => {
    const op = OPERATORS.find(o => o.name === name)
    if (op) setS(prev => ({ ...prev, operator: name, margin: op.margin }))
    else setS(prev => ({ ...prev, operator: name }))
  }

  const handleSave = async () => {
    setSaving(true)
    await saveSettings(s)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">

        {/* País e Idioma */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Região e Idioma</h2>
          <Field label="País / Mercado OMIE">
            <Toggle
              value={s.country}
              onChange={v => update('country', v)}
              options={[
                { value: 'PT', label: '🇵🇹 Portugal' },
                { value: 'ES', label: '🇪🇸 Espanha' },
              ]}
            />
          </Field>
          <Field label="Idioma">
            <Toggle
              value={s.language}
              onChange={v => update('language', v)}
              options={[
                { value: 'pt', label: 'Português' },
                { value: 'es', label: 'Español' },
              ]}
            />
          </Field>
        </div>

        {/* Operador */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Operador</h2>
          <Field label="Operador comercial">
            <select
              value={s.operator}
              onChange={e => handleOperator(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {OPERATORS.map(o => <option key={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Margem (€/kWh)" hint="Componente fixa do contrato">
              <NumInput value={s.margin} onChange={v => update('margin', v)} />
            </Field>
            <Field label="Potência (kVA)">
              <select
                value={s.power}
                onChange={e => update('power', parseFloat(e.target.value))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7].map(v => (
                  <option key={v} value={v}>{v} kVA</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Tarifário */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Opção Horária</h2>
          <Field label="Tipo de tarifário">
            <Toggle
              value={s.type}
              onChange={v => update('type', v)}
              options={[
                { value: 'bi-horario', label: 'Bi-Horário' },
                { value: 'tri-horario', label: 'Tri-Horário' },
              ]}
            />
          </Field>
          {s.type === 'bi-horario' && (
            <>
              <Field label="Ciclo">
                <Toggle
                  value={s.cycle}
                  onChange={v => update('cycle', v)}
                  options={[
                    { value: 'diario', label: 'Diário' },
                    { value: 'semanal', label: 'Semanal' },
                  ]}
                />
              </Field>
              {s.cycle === 'diario' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início do Vazio (h)">
                    <NumInput value={s.biVazioStart} onChange={v => update('biVazioStart', v)} step={1} />
                  </Field>
                  <Field label="Fim do Vazio (h)">
                    <NumInput value={s.biVazioEnd} onChange={v => update('biVazioEnd', v)} step={1} />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* TAR */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">TAR — Acesso às Redes 2026</h2>
            <button
              onClick={() => setS(prev => ({
                ...prev,
                tarVazio: DEFAULT_SETTINGS.tarVazio,
                tarForaVazio: DEFAULT_SETTINGS.tarForaVazio,
                tarPonta: DEFAULT_SETTINGS.tarPonta,
                tarCheia: DEFAULT_SETTINGS.tarCheia,
              }))}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RotateCcw size={11} /> Repor
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vazio (€/kWh)">
              <NumInput value={s.tarVazio} onChange={v => update('tarVazio', v)} />
            </Field>
            <Field label="Fora de Vazio (€/kWh)">
              <NumInput value={s.tarForaVazio} onChange={v => update('tarForaVazio', v)} />
            </Field>
            {s.type === 'tri-horario' && <>
              <Field label="Cheia (€/kWh)">
                <NumInput value={s.tarCheia} onChange={v => update('tarCheia', v)} />
              </Field>
              <Field label="Ponta (€/kWh)">
                <NumInput value={s.tarPonta} onChange={v => update('tarPonta', v)} />
              </Field>
            </>}
          </div>
        </div>

        {/* Impostos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Impostos e Perdas</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="IVA" hint="ex: 0.06">
              <NumInput value={s.iva} onChange={v => update('iva', v)} step={0.01} />
            </Field>
            <Field label="IESPE (€/kWh)">
              <NumInput value={s.iespe} onChange={v => update('iespe', v)} />
            </Field>
            <Field label="Perdas rede" hint="ex: 0.03">
              <NumInput value={s.lossCoeff} onChange={v => update('lossCoeff', v)} step={0.001} />
            </Field>
          </div>
        </div>

        {/* Fórmula */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2 uppercase tracking-wide">Fórmula de cálculo (universal indexados)</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 font-mono leading-relaxed">
            Preço = (OMIE÷1000 × (1+perdas) + margem + TAR) × (1+IVA) + IESPE
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            A fórmula é igual para todos os operadores indexados — só a margem varia. TAR regulada pela ERSE 2026.
          </p>
        </div>

        <div className="pb-4" />
      </main>
    </div>
  )
}
