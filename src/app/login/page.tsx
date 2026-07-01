'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { Mail, Lock, Loader2, Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const emailId = useId()
  const passwordId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        router.push('/')
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('Conta criada! Confirma o email e faz login.')
        setMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      if (msg.includes('Invalid login')) setError('Email ou password incorretos.')
      else if (msg.includes('already registered')) setError('Este email já tem conta.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand panel — desktop left half */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-800 flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <circle cx="80%" cy="15%" r="220" fill="white" fillOpacity="0.04" />
          <circle cx="20%" cy="85%" r="180" fill="white" fillOpacity="0.04" />
          <circle cx="60%" cy="60%" r="300" fill="white" fillOpacity="0.03" />
        </svg>

        <div className="relative z-10">
          <Logo size={40} className="mb-10" />
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Carrega no<br />momento certo.
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed max-w-xs">
            Preços OMIE em tempo real para otimizares o carregamento do teu EV e poupares na fatura.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              '⚡ Dados OMIE atualizados diariamente',
              '📊 Gráfico horário de preços',
              '🎯 Melhor hora para carregar',
            ].map(item => (
              <li key={item} className="text-blue-100 text-sm flex items-center gap-2">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-blue-300 text-xs">
          Dados OMIE · Portugal · TAR 2026 ERSE
        </p>
      </div>

      {/* Form section — right half (or full on mobile) */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Mobile hero header */}
        <div className="md:hidden bg-gradient-to-br from-blue-800 to-emerald-700 px-6 py-8 flex flex-col items-center gap-3">
          <Logo size={40} />
          <p className="text-blue-100 text-sm font-medium">Preços OMIE para o teu EV</p>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm space-y-5">
            {/* Mode heading — desktop only */}
            <div className="hidden md:block text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta gratuita'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {mode === 'login' ? 'Entra na tua conta OptiCharge' : 'Começa a otimizar o carregamento do teu EV'}
              </p>
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
              {error && (
                <div
                  role="alert"
                  className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}
              {success && (
                <div
                  role="status"
                  className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-sm text-green-700 dark:text-green-300"
                >
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id={emailId}
                      type="email"
                      placeholder="o.teu@email.pt"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      inputMode="email"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full pl-9 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Forgot password — login mode only */}
                  {mode === 'login' && (
                    <div className="text-right">
                      <button
                        type="button"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => {/* placeholder */}}
                      >
                        Esqueceu a password?
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 min-h-[48px]"
                >
                  {loading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Zap size={16} />
                  }
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {mode === 'login' ? 'Não tens conta? Regista-te' : 'Já tens conta? Entra'}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">
              Podes usar sem conta — as definições ficam guardadas localmente.{' '}
              <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">Continuar sem login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
