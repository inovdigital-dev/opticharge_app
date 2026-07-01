'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { fetchOmiePrices, formatDate, getToday, getTomorrow, OmiePrice } from '@/lib/omie'
import { loadSettings } from '@/lib/settings'
import { TariffSettings, TARIFF_OPTION_LABELS } from '@/lib/tariff'
import { getUser, signOut } from '@/lib/supabase'
import { SkeletonChart, SkeletonStatus, SkeletonRecommendation } from '@/components/Skeleton'
import RecommendationBox from '@/components/RecommendationBox'
import CurrentStatusWidget from '@/components/CurrentStatusWidget'
import BottomNav from '@/components/BottomNav'
import Logo from '@/components/Logo'
import OnboardingScreen from '@/components/OnboardingScreen'
import Link from 'next/link'
import { Settings, RefreshCw, LogIn, LogOut, Clock } from 'lucide-react'

const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false })

const ONBOARDING_KEY = 'opticharge_welcomed'

interface DayData {
  prices: OmiePrice[]
  isMock: boolean
  source: string
}

export default function Home() {
  const [activeDay, setActiveDay] = useState<'hoje' | 'amanha'>('hoje')
  const [todayData, setTodayData] = useState<DayData>({ prices: [], isMock: false, source: '' })
  const [tomorrowData, setTomorrowData] = useState<DayData>({ prices: [], isMock: false, source: '' })
  const [settings, setSettings] = useState<TariffSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [user, setUser] = useState<{ email?: string | null } | null>(null)
  const [showIVA, setShowIVA] = useState(true)
  const [loadedDate, setLoadedDate] = useState('')

  const today = getToday()
  const tomorrow = getTomorrow()
  const router = useRouter()

  useEffect(() => {
    getUser().then(u => {
      if (!u) { router.replace('/login'); return }
      setUser({ email: u.email })
      setAuthChecked(true)

      // Carregar settings primeiro (guarda no localStorage se vierem do Supabase)
      loadSettings().then(s => {
        setSettings(s)
        // Só mostrar onboarding se não tiver flag E não tiver settings guardadas
        const welcomed = localStorage.getItem(ONBOARDING_KEY)
        const hasSettings = localStorage.getItem('opticharge_settings')
        if (!welcomed && !hasSettings) setShowOnboarding(true)
      })
    })
  }, [])

  const load = async (force = false) => {
    // Usa datas frescas em cada chamada (não captura da closure inicial)
    const t0 = getToday()
    const t1 = getTomorrow()
    setLoading(true)
    try {
      const [t, tm] = await Promise.all([
        fetchOmiePrices(formatDate(t0), force),
        fetchOmiePrices(formatDate(t1), force),
      ])
      setTodayData(t)
      setTomorrowData(tm)
      setLastUpdated(new Date())
      setLoadedDate(formatDate(t0))
    } catch {
      // Se falhar completamente, manter dados anteriores (se existirem)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Detetar mudança de dia e recarregar automaticamente (verifica a cada minuto)
  useEffect(() => {
    const check = setInterval(() => {
      if (loadedDate && formatDate(getToday()) !== loadedDate) load()
    }, 60000)
    return () => clearInterval(check)
  }, [loadedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling quando dados indisponíveis — verifica a cada 5 min com force=true para bypassar cache
  useEffect(() => {
    const unavailable = todayData.isMock || tomorrowData.isMock ||
      todayData.source === 'not-published-yet' || tomorrowData.source === 'not-published-yet'
    if (!unavailable) return
    const poll = setInterval(() => load(true), 5 * 60 * 1000)
    return () => clearInterval(poll)
  }, [todayData.isMock, todayData.source, tomorrowData.isMock, tomorrowData.source]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeData = activeDay === 'hoje' ? todayData : tomorrowData
  const date = activeDay === 'hoje' ? today : tomorrow
  const dayLabel = activeDay === 'hoje' ? 'Hoje' : 'Amanhã'
  const effectiveSettings = settings ? (showIVA ? settings : { ...settings, iva: 0 }) : null

  const fmtDate = (d: Date) => d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  const handleOnboardingDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }

  // D+1 ainda não publicado (source = 'not-published-yet' e sem preços)
  const tomorrowNotPublished = tomorrowData.source === 'not-published-yet' && tomorrowData.prices.length === 0
  const dataUnavailable = activeData.isMock || activeData.source === 'not-published-yet'

  if (!authChecked) return null

  if (showOnboarding) {
    return <OnboardingScreen onDismiss={handleOnboardingDismiss} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={30} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => load()}
              disabled={loading}
              aria-label="Atualizar preços"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/definicoes"
              aria-label="Definições"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings size={17} />
            </Link>
            {user ? (
              <button
                onClick={handleSignOut}
                aria-label="Terminar sessão"
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={user.email ?? ''}
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link
                href="/login"
                aria-label="Iniciar sessão"
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogIn size={17} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-lg mx-auto px-4 py-4 space-y-4 has-bottom-nav">
        {/* Widget estado atual (só no tab Hoje) */}
        {activeDay === 'hoje' && !loading && effectiveSettings && todayData.prices.length > 0 && (
          <CurrentStatusWidget prices={todayData.prices} settings={effectiveSettings} />
        )}

        {/* Seletor de dia */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-1 flex gap-1">
          {(['hoje', 'amanha'] as const).map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                activeDay === day
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="block text-xs opacity-70">{day === 'hoje' ? 'Hoje' : 'Amanhã'}</span>
              <span className="block capitalize text-xs mt-0.5">
                {day === 'hoje'
                  ? today.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
                  : tomorrow.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
              </span>
              {/* Indicador quando D+1 ainda não disponível */}
              {day === 'amanha' && (tomorrowNotPublished || tomorrowData.isMock) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </button>
          ))}
        </div>

        {/* Gráfico / Mensagem indisponibilidade */}
        {loading ? (
          <>
            {activeDay === 'hoje' && <SkeletonStatus />}
            <SkeletonChart />
            <SkeletonRecommendation />
          </>
        ) : dataUnavailable ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950 rounded-2xl flex items-center justify-center">
              <Clock size={32} className="text-amber-400" />
            </div>
            {activeData.source === 'not-published-yet' ? (
              <>
                <div className="space-y-1">
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Preços de {dayLabel.toLowerCase()} ainda não publicados
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{fmtDate(date)}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                  A OMIE publica os preços do dia seguinte normalmente entre as{' '}
                  <strong>13h00</strong> e as <strong>14h30</strong>.
                </p>
                <p className="text-xs text-gray-400">
                  A app verificará automaticamente e atualizará quando os preços estiverem disponíveis.
                </p>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Preços reais não disponíveis
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{fmtDate(date)}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                  Não foi possível obter dados OMIE reais no momento.
                </p>
              </>
            )}
            <button
              onClick={() => load(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <RefreshCw size={14} />
              Verificar agora
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Preço da energia</h2>
                  <p className="text-xs text-gray-400 capitalize">{fmtDate(date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* Toggle IVA */}
                  <button
                    role="switch"
                    aria-checked={showIVA}
                    onClick={() => setShowIVA(v => !v)}
                    className="flex items-center gap-1.5 group"
                    aria-label={`IVA 23% ${showIVA ? 'incluído' : 'excluído'}`}
                  >
                    <span className={`text-[10px] font-medium transition-colors ${showIVA ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                      {showIVA ? 'c/ IVA 23%' : 's/ IVA'}
                    </span>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showIVA ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showIVA ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                    </div>
                  </button>
                  {lastUpdated && (
                    <span className="text-xs text-gray-400">
                      {lastUpdated.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              {effectiveSettings && (
                <PriceChart
                  prices={activeData.prices}
                  settings={effectiveSettings}
                  date={date}
                  isMock={activeData.isMock}
                />
              )}
            </div>
            {effectiveSettings && activeData.prices.length > 0 && (
              <RecommendationBox prices={activeData.prices} settings={effectiveSettings} date={date} label={dayLabel} />
            )}
          </>
        )}

        {/* Info tarifário — compact chip */}
        {settings && !loading && (
          <Link
            href="/definicoes"
            className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-medium text-gray-700 dark:text-gray-300">{settings.operator}</span>
            <span className="flex items-center gap-1.5">
              <span>{TARIFF_OPTION_LABELS[settings.tariffOption]}</span>
              <Settings size={12} />
            </span>
          </Link>
        )}

        <p className="text-center text-xs text-gray-400 pb-2">
          Preços OMIE · Portugal · TAR 2026 ERSE
        </p>
      </main>

      <BottomNav />
    </div>
  )
}
