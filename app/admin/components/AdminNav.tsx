'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',               label: 'Dashboard' },
  { href: '/admin/reservations',  label: 'Reservaciones' },
  { href: '/admin/new-reservation', label: '+ Nueva' },
  { href: '/admin/table-map',     label: 'Mapa de Mesas' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-0 overflow-x-auto">
      {NAV_ITEMS.map(item => {
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              isActive
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
