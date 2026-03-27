import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReservationsClient from './ReservationsClient'

export const metadata = { title: 'Reservaciones | Nanku Admin' }

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <ReservationsClient userEmail={user.email ?? ''} />
}
