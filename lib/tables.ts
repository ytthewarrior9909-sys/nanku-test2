// Table configuration for Nanku Restaurant
// Salón (SA): 9 real tables (not 10)
// Terraza (TE): 13 real tables — 14TE does NOT exist, never show it

export type TableDef = {
  id: string
  label: string
  capacity: number
  linkedTo?: string // 06SA↔07SA always together
  hidden?: boolean  // 07SA is hidden (shown as part of 06SA unit)
}

export type TableCombo = {
  ids: string[]
  capacity: number
  label: string
}

export const SALON_TABLES: TableDef[] = [
  { id: '01SA', label: '01SA', capacity: 6 },
  { id: '02SA', label: '02SA', capacity: 6 },
  { id: '03SA', label: '03SA', capacity: 6 },
  { id: '04SA', label: '04SA', capacity: 8 },
  { id: '05SA', label: '05SA', capacity: 8 },
  // 06SA+07SA are ONE long table — always assigned together, shown as one unit
  { id: '06SA', label: '06-07SA', capacity: 8, linkedTo: '07SA' },
  { id: '07SA', label: '06-07SA', capacity: 0, linkedTo: '06SA', hidden: true },
  { id: '08SA', label: '08SA', capacity: 6 },
  { id: '09SA', label: '09SA', capacity: 6 },
  { id: '10SA', label: '10SA', capacity: 6 },
]

// 14TE does NOT exist — never rendered anywhere
export const TERRAZA_TABLES: TableDef[] = [
  '01TE','02TE','03TE','04TE','05TE','06TE',
  '07TE','08TE','09TE','10TE','11TE','12TE','13TE',
].map(id => ({ id, label: id, capacity: 4 }))

export const ALL_TABLES: TableDef[] = [...SALON_TABLES, ...TERRAZA_TABLES]

export const TABLE_COMBINATIONS: TableCombo[] = [
  { ids: ['01SA','02SA','03SA'], capacity: 18, label: '01-02-03SA (18 pax)' },
  { ids: ['04SA','05SA'],        capacity: 16, label: '04-05SA (16 pax)' },
  { ids: ['08SA','09SA','10SA'], capacity: 18, label: '08-09-10SA (18 pax)' },
]

export const LUNCH_SLOTS  = ['12:00','12:30','13:00','13:30']
export const DINNER_SLOTS = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00']
export const ALL_SLOTS    = [...LUNCH_SLOTS, ...DINNER_SLOTS]

/** Auto-link 06SA↔07SA: if either is selected, include both */
export function expandTableIds(ids: string[]): string[] {
  const set = new Set(ids)
  if (set.has('06SA')) set.add('07SA')
  if (set.has('07SA')) set.add('06SA')
  return Array.from(set)
}

/** Get selectable tables (no hidden ones) for a given zone */
export function getSelectableTables(zone?: string | null): TableDef[] {
  if (zone === 'salon')   return SALON_TABLES.filter(t => !t.hidden)
  if (zone === 'terraza') return TERRAZA_TABLES
  return [...SALON_TABLES.filter(t => !t.hidden), ...TERRAZA_TABLES]
}
