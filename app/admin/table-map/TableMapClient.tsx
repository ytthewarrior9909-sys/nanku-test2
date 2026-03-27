'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '../components/AdminNav'
import {
  type Reservation,
  STATUS_LABELS,
  STATUS_STYLES,
  todayCR,
  formatTimeCR,
  formatDateCR,
  addDays,
} from '@/lib/reservations'
import {
  type TableDef,
  SALON_TABLES,
  TERRAZA_TABLES,
  LUNCH_SLOTS,
  DINNER_SLOTS,
} from '@/lib/tables'

// ─── Constants ────────────────────────────────────────────────────────────────
const ARRIVAL_WINDOW_MS = 20 * 60 * 1000   // 20 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Costa Rica date+time → epoch ms  (CR = UTC-6) */
function crToMs(dateStr: string, timeStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi]    = timeStr.split(':').map(Number)
  return Date.UTC(y, mo - 1, d, h + 6, mi)
}

/** Format a milliseconds duration into a human-readable countdown */
function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Pick the most relevant slot for right now (only meaningful for today) */
function pickSlot(dateStr: string, nowMs: number): string {
  const all   = [...LUNCH_SLOTS, ...DINNER_SLOTS]
  const today = todayCR()
  if (dateStr !== today) return all[0]
  // Prefer an active slot (started, within 2-hour service window)
  const active = all.find(s => {
    const ms = crToMs(dateStr, s)
    return nowMs >= ms && nowMs < ms + 2 * 3600 * 1000
  })
  if (active) return active
  // Otherwise: next upcoming slot
  const next = all.find(s => crToMs(dateStr, s) > nowMs)
  return next ?? all[all.length - 1]
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TableStatus = 'free' | 'pending' | 'upcoming' | 'arriving' | 'overdue'

const TABLE_STYLES: Record<TableStatus, string> = {
  free:     'border-emerald-800/40 bg-emerald-950/10 text-emerald-500',
  pending:  'border-amber-500/40   bg-amber-950/20   text-amber-400',
  upcoming: 'border-sky-500/40     bg-sky-950/20     text-sky-400',
  arriving: 'border-orange-500     bg-orange-950/30  text-orange-400',
  overdue:  'border-red-500/60     bg-red-950/30     text-red-400',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotButton({
  slot, count, selected, onClick,
}: {
  slot: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-lg text-sm font-mono transition ${
        selected
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
          : 'bg-zinc-800/60 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
      }`}
    >
      {slot}
      {count > 0 && (
        <span className={`absolute -top-2 -right-2 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${
          selected ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border-2 inline-block ${color}`} />
      {label}
    </span>
  )
}

function TableCell({
  t, wide = false, status, countdown, res, onClick,
}: {
  t: TableDef
  wide?: boolean
  status: TableStatus
  countdown: { text: string; urgent: boolean } | null
  res: Reservation | undefined
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 transition hover:scale-105 cursor-pointer ${
        wide ? 'col-span-2' : ''
      } ${TABLE_STYLES[status]}`}
      style={{ minHeight: 76 }}
    >
      {/* Pulsing indicator for arrival window */}
      {status === 'arriving' && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500" />
        </span>
      )}

      <span className="text-xs font-mono font-bold leading-tight">{t.label || t.id}</span>
      {t.capacity > 0 && <span className="text-[10px] opacity-50">{t.capacity}p</span>}
      {res && (
        <span className="text-[10px] mt-0.5 truncate max-w-full px-1 leading-tight opacity-90">
          {res.name}
        </span>
      )}
      {countdown && (
        <span className={`text-[9px] font-mono mt-0.5 ${countdown.urgent ? 'font-bold' : 'opacity-40'}`}>
          {countdown.text}
        </span>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TableMapClient({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const today  = todayCR()

  const [date,          setDate]          = useState(today)
  const [now,           setNow]           = useState(() => Date.now())
  const [selectedSlot,  setSelectedSlot]  = useState(() => pickSlot(today, Date.now()))
  const [allRes,        setAllRes]        = useState<Reservation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [detail,        setDetail]        = useState<{ table: string; res: Reservation } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadDay = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/reservations?date=${d}`)
      const j = await r.json()
      setAllRes(j.reservations ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload when date changes; also auto-pick the best slot
  useEffect(() => {
    loadDay(date)
    setSelectedSlot(pickSlot(date, Date.now()))
  }, [date, loadDay])

  // Tick every second for live countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Silent refresh every 30 s to pick up new reservations
  useEffect(() => {
    const id = setInterval(() => loadDay(date), 30_000)
    return () => clearInterval(id)
  }, [date, loadDay])

  // ── Derived: reservation count per slot ────────────────────────────────────
  const slotCounts = useMemo(() => {
    const c: Record<string, number> = {}
    allRes
      .filter(r => r.status === 'confirmed' || r.status === 'pending')
      .forEach(r => { c[r.time] = (c[r.time] ?? 0) + 1 })
    return c
  }, [allRes])

  // ── Derived: confirmed + pending maps for the selected slot ────────────────
  const { tableMap, pendingMap } = useMemo(() => {
    const tMap: Record<string, Reservation> = {}
    const pMap: Record<string, Reservation> = {}
    allRes
      .filter(r => r.time === selectedSlot && (r.status === 'confirmed' || r.status === 'pending'))
      .forEach(r => {
        ;(r.table_ids ?? []).forEach(tid => {
          if (r.status === 'confirmed') tMap[tid] = r
          else                         pMap[tid] = r
        })
      })
    return { tableMap: tMap, pendingMap: pMap }
  }, [allRes, selectedSlot])

  const isToday = date === today

  // ── Status & countdown helpers ─────────────────────────────────────────────
  function getStatus(id: string): TableStatus {
    const res = tableMap[id]
    if (!res) return pendingMap[id] ? 'pending' : 'free'
    if (!isToday) return 'upcoming'
    const elapsed = now - crToMs(res.date, res.time)
    if (elapsed < 0)                  return 'upcoming'
    if (elapsed <= ARRIVAL_WINDOW_MS) return 'arriving'
    return 'overdue'
  }

  function getCountdown(id: string): { text: string; urgent: boolean } | null {
    const res = tableMap[id] ?? pendingMap[id]
    if (!res || !isToday) return null
    const ms      = crToMs(res.date, res.time)
    const diff    = ms - now
    const elapsed = now - ms
    if (diff > 0)
      return { text: `en ${fmtCountdown(diff)}`, urgent: diff < 5 * 60 * 1000 }
    if (elapsed <= ARRIVAL_WINDOW_MS)
      return { text: `↓ ${fmtCountdown(ARRIVAL_WINDOW_MS - elapsed)}`, urgent: true }
    return null
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function quickAction(id: string, status: 'confirmed' | 'cancelled' | 'no_show') {
    setActionLoading(id + status)
    try {
      await fetch('/api/admin/reservations', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, status }),
      })
      setDetail(null)
      await loadDay(date)
    } finally { setActionLoading(null) }
  }

  function handleTableClick(id: string) {
    const status = getStatus(id)
    if (status === 'free') {
      const zone = id.endsWith('SA') ? 'salon' : 'terraza'
      router.push(`/admin/new-reservation?date=${date}&time=${selectedSlot}&zone=${zone}&table=${id}`)
      return
    }
    const res = tableMap[id] ?? pendingMap[id]
    if (res) setDetail({ table: id, res })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // ── Modal computed values ──────────────────────────────────────────────────
  const detailStatus = detail ? getStatus(detail.table) : null
  const windowMs     = detail && detailStatus === 'arriving'
    ? ARRIVAL_WINDOW_MS - (now - crToMs(detail.res.date, detail.res.time))
    : null
  const inArrivalMode = detailStatus === 'arriving' || detailStatus === 'overdue'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <span className="text-orange-400 font-bold text-sm">N</span>
            </div>
            <span className="text-white font-semibold text-sm">Nanku Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-sm hidden md:block">{userEmail}</span>
            <button onClick={handleSignOut}
              className="text-zinc-400 hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-zinc-800">
              Sign out
            </button>
          </div>
        </div>
        <div className="border-t border-zinc-800/50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminNav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Title + date nav ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Mapa de Mesas</h1>
            {!isToday && (
              <p className="text-zinc-500 text-sm mt-0.5">{formatDateCR(date)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(d => addDays(d, -1))}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition">
              ◀
            </button>
            <button onClick={() => setDate(today)}
              className={`px-4 py-1.5 rounded-lg border text-sm transition ${
                isToday
                  ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}>
              Hoy
            </button>
            <button onClick={() => setDate(d => addDays(d, 1))}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition">
              ▶
            </button>
          </div>
        </div>

        {/* ── Slot buttons ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-5 space-y-3">
          <div>
            <p className="text-zinc-600 text-[11px] font-semibold uppercase tracking-widest mb-2">
              Almuerzo
            </p>
            <div className="flex flex-wrap gap-2">
              {LUNCH_SLOTS.map(s => (
                <SlotButton
                  key={s} slot={s}
                  count={slotCounts[s] ?? 0}
                  selected={selectedSlot === s}
                  onClick={() => setSelectedSlot(s)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-zinc-600 text-[11px] font-semibold uppercase tracking-widest mb-2">
              Cena
            </p>
            <div className="flex flex-wrap gap-2">
              {DINNER_SLOTS.map(s => (
                <SlotButton
                  key={s} slot={s}
                  count={slotCounts[s] ?? 0}
                  selected={selectedSlot === s}
                  onClick={() => setSelectedSlot(s)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="flex gap-4 flex-wrap text-xs text-zinc-500 mb-5">
          <LegendDot color="border-emerald-700 bg-emerald-950/30" label="Libre" />
          <LegendDot color="border-amber-500  bg-amber-950/20"   label="Pendiente" />
          <LegendDot color="border-sky-500    bg-sky-950/20"     label="Confirmada" />
          <LegendDot color="border-orange-500 bg-orange-950/30"  label="Llega ahora" />
          <LegendDot color="border-red-600    bg-red-950/30"     label="Sin confirmar" />
        </div>

        {/* ── Table grids ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-600 text-sm animate-pulse">
            Cargando mesas…
          </div>
        ) : (
          <>
            {/* Salón */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-4">
              <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wide mb-4">
                🌿 Salón
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {SALON_TABLES.filter(t => !t.hidden).map(t => (
                  <TableCell
                    key={t.id} t={t}
                    wide={t.id === '06SA'}
                    status={getStatus(t.id)}
                    countdown={getCountdown(t.id)}
                    res={tableMap[t.id] ?? pendingMap[t.id]}
                    onClick={() => handleTableClick(t.id)}
                  />
                ))}
              </div>
            </div>

            {/* Terraza */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wide mb-4">
                🌤 Terraza
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {TERRAZA_TABLES.map(t => (
                  <TableCell
                    key={t.id} t={t}
                    status={getStatus(t.id)}
                    countdown={getCountdown(t.id)}
                    res={tableMap[t.id] ?? pendingMap[t.id]}
                    onClick={() => handleTableClick(t.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setDetail(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white text-lg leading-none"
            >
              ✕
            </button>

            {/* Arrival window banner */}
            {inArrivalMode && (
              <div className={`mb-5 rounded-xl p-4 border ${
                detailStatus === 'arriving'
                  ? 'border-orange-500/30 bg-orange-500/10'
                  : 'border-red-500/30 bg-red-950/30'
              }`}>
                <p className={`text-sm font-semibold text-center mb-1 ${
                  detailStatus === 'arriving' ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {detailStatus === 'arriving'
                    ? '⏱ ¿Llegaron los clientes?'
                    : '⚠ Ventana de llegada vencida'}
                </p>
                {windowMs !== null && (
                  <p className="text-[11px] text-center text-zinc-500 mb-3 font-mono">
                    {fmtCountdown(windowMs)} para confirmar
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => quickAction(detail.res.id, 'confirmed')}
                    disabled={!!actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {actionLoading === detail.res.id + 'confirmed' ? '…' : '✓ Sí llegaron'}
                  </button>
                  <button
                    onClick={() => quickAction(detail.res.id, 'no_show')}
                    disabled={!!actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50 transition"
                  >
                    {actionLoading === detail.res.id + 'no_show' ? '…' : '✕ No llegaron'}
                  </button>
                </div>
              </div>
            )}

            <h3 className="text-orange-400 font-semibold text-lg mb-4">
              Mesa {detail.table}
            </h3>

            <dl className="space-y-2 text-sm mb-4">
              {([
                ['Nombre',   detail.res.name],
                ['Hora',     formatTimeCR(detail.res.time)],
                ['Personas', `${detail.res.party_size} pax`],
                ['Teléfono', detail.res.phone || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200 font-medium">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <dt className="text-zinc-500">Estado</dt>
                <dd>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLES[detail.res.status]}`}>
                    {STATUS_LABELS[detail.res.status]}
                  </span>
                </dd>
              </div>
            </dl>

            {detail.res.notes && (
              <p className="text-zinc-500 text-xs italic border-t border-zinc-800 pt-3 mb-4">
                {detail.res.notes}
              </p>
            )}

            {/* Standard actions (non-arrival states) */}
            {!inArrivalMode && (
              <div className="flex gap-2 flex-wrap mb-2">
                {detail.res.status === 'pending' && (
                  <button
                    onClick={() => quickAction(detail.res.id, 'confirmed')}
                    disabled={!!actionLoading}
                    className="flex-1 text-xs py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                  >
                    {actionLoading ? '…' : '✔ Confirmar'}
                  </button>
                )}
                {(detail.res.status === 'pending' || detail.res.status === 'confirmed') && (
                  <button
                    onClick={() => quickAction(detail.res.id, 'cancelled')}
                    disabled={!!actionLoading}
                    className="flex-1 text-xs py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
                  >
                    {actionLoading ? '…' : '✕ Cancelar'}
                  </button>
                )}
              </div>
            )}

            <Link
              href={`/admin/new-reservation?id=${detail.res.id}`}
              className="block text-center text-xs py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition"
            >
              ✏ Editar reserva
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
