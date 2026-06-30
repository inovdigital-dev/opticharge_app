import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
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
