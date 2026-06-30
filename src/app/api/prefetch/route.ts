import { NextRequest, NextResponse } from 'next/server'

// Chamado pelo cron do Vercel (vercel.json) todos os dias às 13h30 UTC
// Garante que os preços de hoje e amanhã estão sempre no Supabase
// antes de qualquer utilizador abrir a app

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // Validar token do cron (evitar chamadas externas)
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const results = await Promise.allSettled([
    prefetchDate(fmt(today), req),
    prefetchDate(fmt(tomorrow), req),
  ])

  const summary = results.map((r, i) => ({
    date: i === 0 ? fmt(today) : fmt(tomorrow),
    status: r.status,
    value: r.status === 'fulfilled' ? r.value : r.reason?.message,
  }))

  console.log('[prefetch] resultado:', summary)
  return NextResponse.json({ ok: true, summary, timestamp: new Date().toISOString() })
}

async function prefetchDate(date: string, req: NextRequest) {
  const baseUrl = new URL(req.url).origin
  const res = await fetch(`${baseUrl}/api/omie?date=${date}`, {
    headers: { 'x-prefetch': '1' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${date}`)
  const data = await res.json()
  const count = Array.isArray(data) ? data.length : data.prices?.length ?? 0
  const source = Array.isArray(data) ? 'legacy' : data.source
  return `${count} registos (${source}) para ${date}`
}
