'use client'

import { useState } from 'react'

type ArtistRef = {
  name: string
  label: string
  photo?: string | null
  bio?: string | null
  bio_es?: string | null
}

export type ScheduleDayGrid = {
  id: string
  day_of_week: string
  is_active: boolean
  event_label: string
  start_time: string
  event_detail: string | null
  artist?: ArtistRef | null
}

const DAY_NAMES_ES: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
}

function translateLabel(label: string): string {
  if (label === 'Live Band') return 'Banda en Vivo'
  if (label === 'Curated tropical playlist') return 'Playlist tropical'
  if (label.toLowerCase().includes('all evening')) return 'Toda la noche'
  return label
}

function translateTime(time: string): string {
  if (time === 'All evening') return 'Toda la noche'
  return time
}

export default function LiveScheduleGrid({
  schedule,
  lang = 'en',
}: {
  schedule: ScheduleDayGrid[]
  lang?: 'en' | 'es'
}) {
  const [selected, setSelected] = useState<ScheduleDayGrid | null>(null)

  const dayLabel = (d: string) => lang === 'es' ? (DAY_NAMES_ES[d] ?? d) : d
  const liveLabel = lang === 'es' ? 'EN VIVO' : 'LIVE'
  const tapHint = lang === 'es' ? 'Ver detalles' : 'View details'
  const startsLabel = lang === 'es' ? 'Hora:' : 'Starts'

  return (
    <>
      <div className="lm-schedule-grid fade-up">
        {schedule.map(d => {
          const displayLabel = d.is_active && d.artist
            ? d.artist.name
            : (lang === 'es' ? translateLabel(d.event_label) : d.event_label)
          const displayTime = lang === 'es' ? translateTime(d.start_time) : d.start_time

          return (
            <div
              key={d.day_of_week}
              className={`schedule-day${d.is_active ? ' live schedule-day--clickable' : ''}`}
              onClick={d.is_active ? () => setSelected(d) : undefined}
              role={d.is_active ? 'button' : undefined}
              tabIndex={d.is_active ? 0 : undefined}
              onKeyDown={d.is_active ? (e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(d) } : undefined}
            >
              {d.is_active && <span className="schedule-live-badge">{liveLabel}</span>}
              <span className={`schedule-day-name${d.is_active ? ' live' : ''}`}>{dayLabel(d.day_of_week)}</span>
              <div className={`schedule-icon${d.is_active ? ' live' : ''}`}>
                {d.is_active ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </div>
              <div className="schedule-info">
                <p className={`schedule-event${d.is_active ? ' live' : ''}`}>{displayLabel}</p>
                {d.is_active && d.event_detail && (
                  <p className="schedule-event-detail">{d.event_detail}</p>
                )}
                <div className={`schedule-time${d.is_active ? ' live' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {displayTime}
                </div>
                {d.is_active && (
                  <p className="schedule-tap-hint">{tapHint}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Popup ── */}
      {selected && (
        <div
          className="schedule-popup-overlay"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="schedule-popup" onClick={e => e.stopPropagation()}>
            <button
              className="schedule-popup-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {selected.artist?.photo && (
              <div className="schedule-popup-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.artist.photo} alt={selected.artist.name} />
              </div>
            )}

            <div className="schedule-popup-content">
              <div className="schedule-popup-badge-row">
                <span className="schedule-live-badge" style={{ position: 'static', transform: 'none' }}>
                  {liveLabel}
                </span>
                <span className="schedule-popup-dayname">{dayLabel(selected.day_of_week)}</span>
              </div>

              {selected.artist ? (
                <>
                  <h3 className="schedule-popup-artist">{selected.artist.name}</h3>
                  <p className="schedule-popup-genre">{selected.artist.label}</p>
                </>
              ) : (
                <h3 className="schedule-popup-artist">
                  {lang === 'es' ? translateLabel(selected.event_label) : selected.event_label}
                </h3>
              )}

              {selected.event_detail && (
                <p className="schedule-popup-detail">{selected.event_detail}</p>
              )}

              <div className="schedule-popup-time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8751A" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {startsLabel} {lang === 'es' ? translateTime(selected.start_time) : selected.start_time}
                </span>
              </div>

              {selected.artist?.bio && (
                <p className="schedule-popup-bio">
                  {lang === 'es'
                    ? (selected.artist.bio_es || selected.artist.bio)
                    : selected.artist.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
