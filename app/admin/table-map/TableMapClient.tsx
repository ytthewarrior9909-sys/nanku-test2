'use client'

import { useState } from 'react'
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
} from '@/lib/reservations'
import { SALON_TABLES, TERRAZA_TABLES, LUNCH_SLOTS, DINNER_SLOTS } from '@/lib/tables'

type TableStatus = 'free' | 'confirmed' | 'pending'

export default function TableMapClient({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  const [date, setDate]         = useState(todayCR())
  const [time, setTime]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)

  // tableId → reservation for that slot
  const [tableMap, setTableMap]         = useState<Record<string, Reservation>>({})
  const [pendingSet, setPendingSet]     = useState<Set<string>>(new Set())

  // Detail modal
  const [detail, setDetail]             = useState<{ table: string; res: Reservation } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadMap() {
    if (!date || !time) return
    setLoading(true)
    setLoaded(false)
    try {
      const res = await fetch(`/api/admin/reservations?date=${date}`)
      const json = await res.json()
      const allForDay: Reservation[] = json.reservations ?? []
      const forSlot = allForDay.filter(r => r.time === time)

      const tMap: Record<string, Reservation> = {}
      const pSet = new Set<string>()

      forSlot.forEach(r => {
        (r.table_ids ?? []).forEach(tid => {
          if (r.status === 'confirmed') tMap[tid] = r
          if (r.status === 'pending')   pSet.add(tid)
        })
      })

      setTableMap(tMap)
      setPendingSet(pSet)
      setLoaded(true)
    } finally { setLoading(false) }
  }

  function tableState(id: string): TableStatus {
    if (tableMap[id])    return 'confirmed'
    if (pendingSet.has(id)) return 'pending'
    return 'free'
  }

  function handleTableClick(id: string) {
    const state = tableState(id)
    if (state === 'confirmed') {
      setDetail({ table: id, res: tableMap[id] })
    } else if (state === 'pending') {
      // Find the pending reservation for this table from a second lookup (not in tableMap)
      // Show a lighter info for now — just navigate to create with pre-selection
      alert('Esta mesa tiene una reserva pendiente. Ve a Dashboard para gestionarla.')
    } else {
      const zone = id.endsWith('SA') ? 'salon' : 'terraza'
      router.push(`/admin/new-reservation?date=${date}&time=${time}&zone=${zone}&table=${id}`)
    }
  }

  async function quickAction(id: string, status: 'confirmed' | 'cancelled') {
    setActionLoading(id + status)
    try {
      await fetch('/api/admin/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setDetail(null)
      await loadMap()
    } finally { setActionLoading(null) }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  function TableCell({ t, wide = false }: { t: typeof SALON_TABLES[0]; wide?: boolean }) {
    const state = tableState(t.id)
    const res   = tableMap[t.id]
    return (
      <button
        onClick={() => handleTableClick(t.id)}
        className={`flex flex-col items-center justify-center rounded-xl border-2 p-2 transition hover:scale-105 cursor-pointer ${
          wide ? 'col-span-2' : ''
        } ${
          state === 'confirmed'
            ? 'border-red-500/50 bg-red-950/30 text-red-400'
            : state === 'pending'
            ? 'border-amber-500/40 bg-amber-950/20 text-amber-400'
            : 'border-emerald-800/40 bg-emerald-950/10 text-emerald-500'
        }`}
        style={{ minHeight: 72 }}
      >
        <span className="text-xs font-mono font-bold">{t.label || t.id}</span>
        {t.capacity > 0 && <span className="text-[10px] opacity-60">{t.capacity}p</span>}
        {res && <span className="text-[10px] mt-0.5 truncate max-w-full px-1">{res.name}</span>}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
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
            <button onClick={handleSignOut} className="text-zinc-400 hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-zinc-800">Sign out</button>
          </div>
        </div>
        <div className="border-t border-zinc-800/50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminNav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Mapa de Mesas</h1>

        {/* Controls */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-zinc-500 text-xs uppercase tracking-wide mb-1">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-zinc-500 text-xs uppercase tracking-wide mb-1">Turno</label>
            <select value={time} onChange={e => setTime(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
              <option value="">— Seleccionar —</option>
              <optgroup label="Almuerzo">
                {LUNCH_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
              <optgroup label="Cena">
                {DINNER_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            </select>
          </div>
          <button onClick={loadMap} disabled={!date || !time || loading}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition">
            {loading ? 'Cargando…' : 'Ver disponibilidad'}
          </button>

          {/* Legend */}
          <div className="flex gap-4 ml-auto text-xs text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-700 bg-emerald-950/30 inline-block"></span>Libre</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-red-600 bg-red-950/30 inline-block"></span>Confirmada</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-950/20 inline-block"></span>Pendiente</span>
          </div>
        </div>

        {!loaded ? (
          <p className="text-zinc-600 text-sm text-center py-12">Selecciona fecha y turno para ver el mapa.</p>
        ) : (
          <>
            {/* Salón */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-5">
              <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wide mb-4">🌿 Salón</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {SALON_TABLES.filter(t => !t.hidden).map(t => (
                  <TableCell key={t.id} t={t} wide={t.id === '06SA'} />
                ))}
              </div>
            </div>

            {/* Terraza */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wide mb-4">🌤 Terraza</h2>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {TERRAZA_TABLES.map(t => (
                  <TableCell key={t.id} t={t} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-lg leading-none">✕</button>

            <h3 className="text-orange-400 font-semibold text-lg mb-4">Mesa {detail.table}</h3>

            <dl className="space-y-2 text-sm mb-4">
              {[
                ['Nombre',   detail.res.name],
                ['Hora',     formatTimeCR(detail.res.time)],
                ['Personas', `${detail.res.party_size} pax`],
                ['Teléfono', detail.res.phone || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200 font-medium">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <dt className="text-zinc-500">Estado</dt>
                <dd><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLES[detail.res.status]}`}>{STATUS_LABELS[detail.res.status]}</span></dd>
              </div>
            </dl>

            {detail.res.notes && (
              <p className="text-zinc-500 text-xs italic border-t border-zinc-800 pt-3 mb-4">{detail.res.notes}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Link href={`/admin/new-reservation?id=${detail.res.id}`}
                className="flex-1 text-center text-xs py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white transition">
                ✏ Editar
              </Link>
              {detail.res.status === 'pending' && (
                <button onClick={() => quickAction(detail.res.id, 'confirmed')} disabled={!!actionLoading}
                  className="flex-1 text-xs py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition">
                  {actionLoading ? '…' : '✔ Confirmar'}
                </button>
              )}
              {(detail.res.status === 'pending' || detail.res.status === 'confirmed') && (
                <button onClick={() => quickAction(detail.res.id, 'cancelled')} disabled={!!actionLoading}
                  className="flex-1 text-xs py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition">
                  {actionLoading ? '…' : '✕ Cancelar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
