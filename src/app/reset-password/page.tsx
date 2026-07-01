'use client'

import { useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { getClient, updatePassword } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const passwordId = useId()
  const confirmId = useId()

  useEffect(() => {
    // O Supabase client deteta automaticamente o access_token no URL hash e estabelece a sessão
    const sb = getClient()
    if (!sb) { setChecking(false); return }

    // Dar tempo ao cliente para processar o hash
    const timer = setTimeout(async () => {
      const { data: { session } } = await sb.auth.getSession()
      setHasSession(!!session)
      setChecking(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('As passwords não coincidem.'); return }
    if (password.length < 6) { setError('A password tem de ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    setError(null)
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push('/'), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar a password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nova password</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define uma nova password para a tua conta</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          {checking ? (
            <div className="flex justify-center py-6">
              <Loader2 size={22} className="animate-spin text-gray-400" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={40} className="text-green-500" />
              <p className="font-semibold text-gray-900 dark:text-white">Password atualizada!</p>
              <p className="text-sm text-gray-500">A redirecionar para a app...</p>
            </div>
          ) : !hasSession ? (
            <div role="alert" className="text-center space-y-3 py-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Link inválido ou expirado.</p>
              <p className="text-xs text-gray-500">Pede um novo link de recuperação na página de login.</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div role="alert" className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nova password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
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
              </div>

              <div className="space-y-1">
                <label htmlFor={confirmId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id={confirmId}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repete a nova password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 min-h-[48px]"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                Guardar nova password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
