// ─────────────────────────────────────────────────────────────────────────────
// BEFORE FIRST USE: Run this SQL in the Supabase SQL Editor
//
// ALTER TABLE reservations
//   ADD COLUMN IF NOT EXISTS zone         text,
//   ADD COLUMN IF NOT EXISTS table_ids    text[],
//   ADD COLUMN IF NOT EXISTS source       text DEFAULT 'web_form',
//   ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
// ─────────────────────────────────────────────────────────────────────────────

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show'

export type Reservation = {
  id: string
  name: string
  email: string | null
  phone: string
  date: string          // YYYY-MM-DD
  time: string          // HH:MM
  party_size: string
  status: ReservationStatus
  notes: string | null
  created_at: string
  updated_at: string | null
  zone: string | null           // 'salon' | 'terraza' | null
  table_ids: string[] | null
  source: string | null         // 'web_form' | 'whatsapp' | 'phone' | 'walk_in'
  confirmed_at: string | null
}

export type ReservationInput = {
  name: string
  email?: string | null
  phone: string
  date: string
  time: string
  party_size: string
  status?: ReservationStatus
  notes?: string | null
  zone?: string | null
  table_ids?: string[] | null
  source?: string | null
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show:   'No se presentó',
}

export const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

/** Returns today's date in Costa Rica timezone as YYYY-MM-DD */
export function todayCR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
}

export function formatDateCR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`
}

export function formatTimeCR(timeStr: string): string {
  if (!timeStr) return ''
  const [h, min] = timeStr.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return dt.toLocaleDateString('en-CA')
}
