import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function sc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function isAuthed(): Promise<boolean> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

export async function GET() {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await sc().from('weekly_events').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(request: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { title, subtitle, image_url, cta_link, cta_text, is_active, sort_order } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await sc()
    .from('weekly_events')
    .insert({
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      image_url: image_url?.trim() || null,
      cta_link: cta_link?.trim() || null,
      cta_text: cta_text?.trim() || null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function PATCH(request: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await sc()
    .from('weekly_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  if (!await isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await sc().from('weekly_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
