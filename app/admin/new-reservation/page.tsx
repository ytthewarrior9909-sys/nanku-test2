import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewReservationClient from './NewReservationClient'

export const metadata = { title: 'Nueva Reserva | Nanku Admin' }

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await searchParams

  // In edit mode, pre-load the reservation server-side
  let existing = null
  if (id) {
    const { data } = await supabase.from('reservations').select('*').eq('id', id).single()
    existing = data ?? null
  }

  return (
    <NewReservationClient
      userEmail={user.email ?? ''}
      editId={id ?? null}
      existing={existing}
    />
  )
}
