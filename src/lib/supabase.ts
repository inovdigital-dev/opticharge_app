import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TariffSettings } from './tariff'

let _client: SupabaseClient | null = null

export function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!_client) _client = createClient(url, key)
  return _client
}

export interface OmiePriceRow {
  date: string
  hour: number
  price_mwh: number
}

export async function getCachedPrices(date: string): Promise<OmiePriceRow[] | null> {
  const sb = getClient()
  if (!sb) return null
  const { data, error } = await sb
    .from('omie_prices')
    .select('date, hour, price_mwh')
    .eq('date', date)
    .order('hour')
  if (error || !data || data.length < 24) return null
  return data
}

export async function cachePrices(prices: OmiePriceRow[]): Promise<void> {
  const sb = getClient()
  if (!sb || !prices.length) return
  await sb.from('omie_prices').upsert(prices, { onConflict: 'date,hour' })
}

export async function getUserSettings(): Promise<TariffSettings | null> {
  const sb = getClient()
  if (!sb) return null
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('user_settings').select('settings').eq('id', user.id).single()
  return data?.settings ?? null
}

export async function saveUserSettings(settings: TariffSettings): Promise<void> {
  const sb = getClient()
  if (!sb) return
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('user_settings').upsert({ id: user.id, settings, updated_at: new Date().toISOString() })
}

export async function signIn(email: string, password: string) {
  const sb = getClient()
  if (!sb) throw new Error('Supabase não configurado')
  return sb.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  const sb = getClient()
  if (!sb) throw new Error('Supabase não configurado')
  return sb.auth.signUp({ email, password })
}

export async function signOut() {
  const sb = getClient()
  if (!sb) return
  await sb.auth.signOut()
}

export async function getUser() {
  const sb = getClient()
  if (!sb) return null
  const { data: { user } } = await sb.auth.getUser()
  return user
}
