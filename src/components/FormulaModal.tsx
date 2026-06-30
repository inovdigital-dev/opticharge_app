'use client'

import { useEffect } from 'react'
import { X, ExternalLink, Info } from 'lucide-react'
import { OperatorPreset } from '@/lib/operators'
import { TariffSettings, calcPrice } from '@/lib/tariff'

interface Props {
  operator: OperatorPreset
  settings: TariffSettings
  onClose: () => void
}

// Exemplo de cálculo com OMIE=50 €/MWh num período de Fora de Vazio
const EXAMPLE_OMIE_MWH = 50

export default function FormulaModal({ operator, settings, onClose }: Props) {
  // Fechar com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const examplePrice = calcPrice(EXAMPLE_OMIE_MWH, 'fora-vazio', settings)
  const exampleOmieKwh = EXAMPLE_OMIE_MWH / 1000
  const adeq = settings.adequacyFactor ?? 1.0
  const inner = settings.innerCosts ?? 0
  const tar = settings.tarForaVazio
  const tse = settings.tse ?? 0
  const go = settings.go ?? 0
  const mfrr = settings.mfrr ?? 0

  // Componentes do custo (para barra visual)
  const omieNet = exampleOmieKwh * adeq * (1 + settings.lossCoeff)
  const innerNet = inner * (1 + settings.lossCoeff)
  const marginNet = settings.margin
  const tarNet = tar
  const extrasNet = tse + go + mfrr
  const preTax = omieNet + innerNet + marginNet + tarNet + extrasNet
  const ivaAmt = preTax * settings.iva
  const total = preTax * (1 + settings.iva) + settings.iespe

  const components = [
    { label: 'OMIE × F_adeq × (1+Perdas)', value: omieNet, color: '#94a3b8' },
    ...(innerNet > 0 ? [{ label: 'Custos sistema × (1+Perdas)', value: innerNet, color: '#fb923c' }] : []),
    { label: 'Margem comercial', value: marginNet, color: '#60a5fa' },
    { label: 'TAR ' + (settings.tariffOption === 'simples' ? '(Simples)' : settings.tariffOption?.startsWith('bi') ? '(Fora Vazio)' : '(período)'), value: tarNet, color: '#f97316' },
    ...(extrasNet > 0 ? [{ label: 'TSE + GO + mFRR', value: extrasNet, color: '#a78bfa' }] : []),
    { label: 'IVA 6%', value: ivaAmt, color: '#34d399' },
    ...(settings.iespe > 0 ? [{ label: 'IESPE', value: settings.iespe, color: '#f43f5e' }] : []),
  ].filter(c => c.value > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 pt-5 pb-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Info size={15} className="text-blue-500 shrink-0" />
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Fórmula de Cálculo
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  operator.type === 'quarto-horario'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {operator.type === 'quarto-horario' ? 'Dinâmico' : 'Média'}
                </span>
              </div>
              <h2 className="font-bold text-gray-900 dark:text-white">{operator.name}</h2>
              <p className="text-xs text-gray-400">{operator.company}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* Fórmula */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-semibold">Fórmula</p>
            <code className="text-sm font-mono text-blue-700 dark:text-blue-300 leading-relaxed block">
              {operator.formulaStr}
            </code>
            <p className="text-[10px] text-gray-400 mt-2">
              + IVA 6% sobre o total + IESPE ({settings.iespe.toFixed(4)} €/kWh)
            </p>
          </div>

          {/* Variáveis */}
          <div>
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-semibold">Variáveis</p>
            <div className="space-y-2">
              {operator.variables.map(v => (
                <div key={v.symbol} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <code className="text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md shrink-0 min-w-[60px] text-center">
                    {v.symbol}
                  </code>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{v.name}</span>
                      {v.value !== undefined && (
                        <span className="text-xs text-gray-500 tabular-nums">
                          = {v.value.toFixed(4)} {v.unit}
                        </span>
                      )}
                      {v.value === undefined && (
                        <span className="text-[10px] text-amber-500 font-medium">variável</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exemplo calculado */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">
              Exemplo — OMIE = {EXAMPLE_OMIE_MWH} €/MWh, período Fora de Vazio
            </p>

            {/* Barra de composição */}
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
              {components.map((c, i) => (
                <div
                  key={i}
                  style={{ width: `${(c.value / total) * 100}%`, background: c.color }}
                  title={`${c.label}: ${c.value.toFixed(4)} €/kWh`}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              {components.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ background: c.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{c.label}</span>
                  </div>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300 font-medium">
                    {c.value.toFixed(4)} €/kWh
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="text-blue-800 dark:text-blue-200">Total</span>
                <span className="text-blue-600 dark:text-blue-400 tabular-nums">{examplePrice.toFixed(4)} €/kWh</span>
              </div>
            </div>
          </div>

          {/* Nota das perdas */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Nota sobre as Perdas:</strong> os coeficientes de perdas são publicados pela ERSE a cada 15 minutos e variam ao longo do dia. Esta app usa uma estimativa fixa de {(settings.lossCoeff * 100).toFixed(1)}% (configurável nas definições). O valor real pode variar entre 2% e 5%.
            </p>
          </div>

          {/* Fonte */}
          {operator.url && (
            <a
              href={operator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-blue-500 transition-colors py-1"
            >
              <ExternalLink size={12} />
              {operator.company} — Ver tarifário oficial
            </a>
          )}
          <a
            href="https://www.tiagofelicia.pt/formulas-tarifarios-indexados"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-blue-500 transition-colors py-1"
          >
            <ExternalLink size={12} />
            Fonte das fórmulas: tiagofelicia.pt
          </a>
        </div>
      </div>
    </div>
  )
}
