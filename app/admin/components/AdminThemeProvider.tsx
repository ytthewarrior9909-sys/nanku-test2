'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
}

const AdminThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} })

export function useAdminTheme() {
  return useContext(AdminThemeContext)
}

export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('nanku-admin-theme') as Theme | null
    if (saved === 'dark') setTheme('dark')
  }, [])

  function toggle() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('nanku-admin-theme', next)
      return next
    })
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}
