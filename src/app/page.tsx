'use client'

import { useState, useEffect } from 'react'
import { fetchOmiePrices, formatDate, getToday, getTomorrow, OmiePrice } from '@/lib/omie'
import { loadSettings } from '@/lib/settings'
import { TariffSettings } from '@/lib/tariff'
import { getUser, signOut } from '@/lib/supabase'
import PriceChart from '@/components/PriceChart'
import RecommendationBox from '@/components/RecommendationBox'
import CurrentStatusWidget from '@/components/CurrentStatusWidget'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { Settings, RefreshCw, LogIn, LogOut } from 'lucide-react'

export default function Home() {
  const [activeDay, setActiveDay] = useState<'hoje' | 'amanha'>('amanha')
  const [todayPrices, setTodayPrices] = useState<OmiePrice[]>([])
  const [tomorrowPrices, setTomorrowPrices] = useState<OmiePrice[]>([])
  const [settings, setSettings] = useState<TariffSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [user, setUser] = useState<{ email?: string | null } | null>(null)

  const today = getToday()
  const tomorrow = getTomorrow()

  useEffect(() => {
    loadSettings().then(setSettings)
    getUser().then(u => setUser(u ? { email: u.email } : null))
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, tm] = await Promise.all([
        fetchOmiePrices(formatDate(today)),
        fetchOmiePrices(formatDate(tomorrow)),
      ])
      setTodayPrices(t)
      setTomorrowPrices(tm)
      setLastUpdated(new Date())
    } catch {
      setError('Erro ao carregar preços OMIE. A usar dados estimados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prices = activeDay === 'hoje' ? todayPrices : tomorrowPrices
  const date = activeDay === 'hoje' ? today : tomorrow
  const dayLabel = activeDay === 'hoje' ? 'Hoje' : 'Amanhã'

  const fmtDate = (d: Date) => d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={30} />
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link href="/definicoes" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Settings size={17} />
            </Link>
            {user ? (
              <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={user.email ?? ''}>
                <LogOut size={17} />
              </button>
            ) : (
              <Link href="/login" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <LogIn size={17} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Widget estado atual (só no tab Hoje) */}
        {activeDay === 'hoje' && !loading && settings && todayPrices.length > 0 && (
          <CurrentStatusWidget prices={todayPrices} settings={settings} />
        )}

        {/* Seletor de dia */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-1 flex gap-1">
          {(['hoje', 'amanha'] as const).map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ {error}
          </div>
        )}

        {/* Gráfico */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Preço da energia</h2>
              <p className="text-xs text-gray-400 capitalize">{fmtDate(date)}</p>
            </div>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                {lastUpdated.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <RefreshCw size={22} className="animate-spin" />
                <span className="text-xs">A carregar preços OMIE...</span>
              </div>
            </div>
          ) : settings ? (
            <PriceChart prices={prices} settings={settings} date={date} />
          ) : null}
        </div>

        {/* Recomendação */}
        {!loading && settings && prices.length > 0 && (
          <RecommendationBox prices={prices} settings={settings} date={date} label={dayLabel} />
        )}

        {/* Info tarifário */}
        {settings && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tarifário ativo</h3>
              <Link href="/definicoes" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Editar</Link>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                <div className="text-xs text-gray-400 mb-0.5">Operador</div>
                <div className="font-medium text-gray-800 dark:text-gray-200 text-xs leading-tight">{settings.operator}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                <div className="text-xs text-gray-400 mb-0.5">Opção horária</div>
                <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{settings.type === 'bi-horario' ? 'Bi-Horário' : 'Tri-Horário'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                <div className="text-xs text-gray-400 mb-0.5">TAR Vazio</div>
                <div className="font-medium text-green-600 text-xs">{(settings.tarVazio * 100).toFixed(2)} cênt/kWh</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                <div className="text-xs text-gray-400 mb-0.5">TAR Fora Vazio</div>
                <div className="font-medium text-orange-600 text-xs">{(settings.tarForaVazio * 100).toFixed(2)} cênt/kWh</div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Preços OMIE · Portugal · TAR 2026 ERSE
        </p>
      </main>
    </div>
  )
}
