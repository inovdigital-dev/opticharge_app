'use client'

import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { Zap, BarChart2, Target, Settings } from 'lucide-react'

const FEATURES = [
  { icon: BarChart2, text: 'Gráfico horário com os preços OMIE do dia' },
  { icon: Target,    text: 'Melhor hora para carregares — hoje e amanhã' },
  { icon: Zap,       text: 'Custo real calculado com o teu tarifário' },
]

interface Props {
  onDismiss: () => void
}

export default function OnboardingScreen({ onDismiss }: Props) {
  const router = useRouter()

  const handleStart = () => {
    onDismiss()
    router.push('/definicoes')
  }

  const handleSkip = () => {
    onDismiss()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={36} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              Bem-vindo ao OptiCharge
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed max-w-xs">
              Otimiza o carregamento do teu EV com os preços reais do mercado elétrico ibérico.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
            </div>
          ))}
        </div>

        {/* Onboarding callout */}
        <div className="w-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
          <Settings size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            Para começar, precisamos de saber o teu tarifário de eletricidade. Assim calculamos o custo real por kWh com base nos teus dados.
          </p>
        </div>

        {/* CTAs */}
        <div className="w-full space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
          >
            <Settings size={16} />
            Configurar o meu tarifário
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-3 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors min-h-[44px]"
          >
            Explorar primeiro sem configurar
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Podes alterar o tarifário a qualquer momento nas definições.
        </p>
      </div>
    </div>
  )
}
