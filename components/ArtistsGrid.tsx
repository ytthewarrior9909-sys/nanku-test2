'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface Artist {
  name: string
  label: string
  photo: string
  bio: string
}

export default function ArtistsGrid({ artists, lang = 'en' }: { artists: Artist[]; lang?: 'en' | 'es' }) {
  const [selected, setSelected] = useState<Artist | null>(null)

  const reserveHref = lang === 'es' ? '/es#reservations' : '/#reservations'
  const reserveLabel = lang === 'es' ? 'Reservar para Noche de Música' : 'Reserve for Music Night'

  return (
    <>
      <div className="lm-artists-grid fade-up">
        {artists.map(artist => (
          <div
            key={artist.name}
            className="artist-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelected(artist)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelected(artist)}
          >
            <Image
              src={artist.photo}
              alt={artist.name}
              loading="lazy"
              width={600}
              height={750}
              className="artist-img"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
            <div className="artist-overlay"></div>
            <div className="artist-hover-overlay"></div>
            <div className="artist-info">
              <h3 className="artist-name">{artist.name}</h3>
              <p style={{ color: '#E8751A', fontSize: '0.75rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0.25rem 0 0.5rem' }}>{artist.label}</p>
              <div className="artist-line"></div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontFamily: 'Lato, sans-serif', lineHeight: 1.5, marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{artist.bio}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Artist Popup */}
      {selected && (
        <div className="am-backdrop" onClick={() => setSelected(null)}>
          <div className="am-modal" onClick={(e) => e.stopPropagation()}>
            <button className="am-close" onClick={() => setSelected(null)} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="am-columns">
              <div className="am-photo">
                <Image
                  src={selected.photo}
                  alt={selected.name}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top center' }}
                />
              </div>
              <div className="am-info">
                <p className="am-label">{selected.label}</p>
                <h2 className="am-name">{selected.name}</h2>
                <div className="am-divider"></div>
                <p className="am-bio">{selected.bio}</p>
                <div className="am-reserve">
                  <Link href={reserveHref} className="am-reserve-btn" onClick={() => setSelected(null)}>
                    {reserveLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
