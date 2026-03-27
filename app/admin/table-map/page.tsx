import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TableMapClient from './TableMapClient'

export const metadata = { title: 'Mapa de Mesas | Nanku Admin' }

export default async function TableMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <TableMapClient userEmail={user.email ?? ''} />
}
