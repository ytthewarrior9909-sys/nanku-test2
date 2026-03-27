'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type ScheduleDay = {
  id: string
  day_of_week: string
  is_active: boolean
  event_label: string
  start_time: string
  sort_order: number
}

export type WeeklyEvent = {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  cta_link: string | null
  cta_text: string | null
  is_active: boolean
  sort_order: number
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  image_url: '',
  cta_link: '',
  cta_text: '',
  is_active: true,
  sort_order: 0,
}

function Toggle({ active, onChange, disabled }: { active: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-orange-500' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function LiveMusicManager({
  initialSchedule,
  initialEvents,
}: {
  initialSchedule: ScheduleDay[]
  initialEvents: WeeklyEvent[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule)
  const [events, setEvents] = useState<WeeklyEvent[]>(initialEvents)

  const [savingDayId, setSavingDayId] = useState<string | null>(null)
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<WeeklyEvent | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  async function toggleDay(day: ScheduleDay) {
    const newActive = !day.is_active
    setSavingDayId(day.id)
    setSchedule(prev => prev.map(d => d.id === day.id ? { ...d, is_active: newActive } : d))
    await fetch('/api/admin/live-music/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: day.id, is_active: newActive }),
    })
    setSavingDayId(null)
    startTransition(() => router.refresh())
  }

  async function toggleEventActive(event: WeeklyEvent) {
    const newActive = !event.is_active
    setSavingEventId(event.id)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_active: newActive } : e))
    await fetch('/api/admin/live-music/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, is_active: newActive }),
    })
    setSavingEventId(null)
    startTransition(() => router.refresh())
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    setDeletingId(id)
    await fetch('/api/admin/live-music/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeletingId(null)
    startTransition(() => router.refresh())
  }

  function openAdd() {
    setEditingEvent(null)
    setForm({ ...EMPTY_FORM, sort_order: events.length })
    setShowAddForm(true)
    setFormError('')
  }

  function openEdit(event: WeeklyEvent) {
    setEditingEvent(event)
    setForm({
      title: event.title,
      subtitle: event.subtitle ?? '',
      image_url: event.image_url ?? '',
      cta_link: event.cta_link ?? '',
      cta_text: event.cta_text ?? '',
      is_active: event.is_active,
      sort_order: event.sort_order,
    })
    setShowAddForm(false)
    setFormError('')
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingEvent(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function submitForm() {
    if (!form.title.trim()) { setFormError('Title is required'); return }
    setSavingForm(true)
    setFormError('')
    try {
      if (editingEvent) {
        const res = await fetch('/api/admin/live-music/events', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEvent.id, ...form }),
        })
        if (res.ok) {
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...form } : e))
          setEditingEvent(null)
        }
      } else {
        const res = await fetch('/api/admin/live-music/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const { event } = await res.json()
          setEvents(prev => [...prev, event])
          setShowAddForm(false)
          setForm(EMPTY_FORM)
        }
      }
      startTransition(() => router.refresh())
    } finally {
      setSavingForm(false)
    }
  }

  const EventForm = (
    <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-5 space-y-4 mt-3">
      <h4 className="text-white font-semibold text-sm">{editingEvent ? 'Edit Event' : 'New Event'}</h4>
      {formError && <p className="text-red-400 text-xs">{formError}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-400 text-xs mb-1.5">Title *</label>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Friday Jazz Night"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-400 text-xs mb-1.5">Image URL</label>
          <input
            value={form.image_url}
            onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-zinc-400 text-xs mb-1.5">Subtitle / Description</label>
          <textarea
            value={form.subtitle}
            onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
            rows={2}
            placeholder="Enjoy live jazz, signature cocktails and a unique atmosphere..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition resize-none"
          />
        </div>
        <div>
          <label className="block text-zinc-400 text-xs mb-1.5">CTA Button Text</label>
          <input
            value={form.cta_text}
            onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))}
            placeholder="Reserve Now"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-400 text-xs mb-1.5">CTA Link</label>
          <input
            value={form.cta_link}
            onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div>
          <label className="block text-zinc-400 text-xs mb-1.5">Display Order</label>
          <input
            type="number"
            min={0}
            value={form.sort_order}
            onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div className="flex items-center gap-3 pt-4">
          <span className="text-zinc-400 text-xs">Active on website</span>
          <Toggle active={form.is_active} onChange={() => setForm(p => ({ ...p, is_active: !p.is_active }))} />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={submitForm}
          disabled={savingForm}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {savingForm ? 'Saving…' : editingEvent ? 'Update Event' : 'Create Event'}
        </button>
        <button onClick={cancelForm} className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition">
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ── Live Music Schedule ── */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900/80 border-b border-zinc-800 px-5 py-3.5 flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8751A" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <h3 className="text-white font-semibold text-sm">Live Music Schedule</h3>
          <span className="text-zinc-500 text-xs ml-1">· Toggle which days have live music</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {schedule.map(day => (
            <div
              key={day.id}
              className={`flex items-center justify-between px-5 py-3.5 transition ${day.is_active ? 'bg-orange-500/5' : 'bg-zinc-900/20'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 text-xs font-bold uppercase tracking-wide ${day.is_active ? 'text-orange-400' : 'text-zinc-600'}`}>
                  {day.day_of_week.slice(0, 3)}
                </span>
                <div>
                  <p className={`text-sm font-medium ${day.is_active ? 'text-white' : 'text-zinc-400'}`}>{day.day_of_week}</p>
                  <p className="text-zinc-500 text-xs">{day.event_label} · {day.start_time}</p>
                </div>
                {day.is_active && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/25">
                    LIVE
                  </span>
                )}
              </div>
              <Toggle active={day.is_active} onChange={() => toggleDay(day)} disabled={savingDayId === day.id} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Weekly Events ── */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900/80 border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3 className="text-white font-semibold text-sm">Weekly Events</h3>
            <span className="text-zinc-500 text-xs ml-1">· Promotional cards shown on the website</span>
          </div>
          {!showAddForm && !editingEvent && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Event
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {showAddForm && EventForm}

          {events.length === 0 && !showAddForm && (
            <div className="text-center py-10 text-zinc-600 text-sm">
              No events yet. Click &ldquo;Add Event&rdquo; to create the first one.
            </div>
          )}

          {events.map(event => (
            <div key={event.id}>
              <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition ${event.is_active ? 'border-zinc-700/60 bg-zinc-800/25' : 'border-zinc-800 bg-zinc-900/20 opacity-50'}`}>
                {event.image_url && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{event.title}</p>
                  {event.subtitle && <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{event.subtitle}</p>}
                  {event.cta_text && (
                    <p className="text-orange-400/70 text-xs mt-0.5">
                      CTA: {event.cta_text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Toggle active={event.is_active} onChange={() => toggleEventActive(event)} disabled={savingEventId === event.id} />
                  <button
                    onClick={() => openEdit(event)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition"
                    title="Edit"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    disabled={deletingId === event.id}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40"
                    title="Delete"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {editingEvent?.id === event.id && EventForm}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
