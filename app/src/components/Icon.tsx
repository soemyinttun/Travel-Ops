/** Plain line icons (no emoji), drawn as SVG so they look the same on every phone and computer. */
const PATHS = {
  overview: 'M4 4v16h16 M9 16v-4 M13 16V8 M17 16v-6',
  revenue: 'M3 6h18v12H3z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M6 12h.01 M18 12h.01',
  packages: 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18',
  visa: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 14l2 2 4-4',
  passport: 'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h3',
  tickets: 'M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 8v10',
  trips: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  heatmaps: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  bookings: 'M6 4h12v17H6z M9 9h6 M9 13h6 M9 17h4',
  customers: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 5.5a3 3 0 0 1 0 5.5 M18 14.5c1.8.7 3 2.7 3 5.5',
  settings: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4h2V5z M7 15v4h2v-4z',
  admin: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  logo: 'M3 20l6-10 4 6 3-4 5 8z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  more: 'M5 5h5v5H5z M14 5h5v5h-5z M5 14h5v5H5z M14 14h5v5h-5z',
  ops: 'M4 5h16v14H4z M8 10l3 2-3 2 M13 15h3',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-4.5-4.5',
  chevron: 'M9 6l6 6-6 6',
  alert: 'M12 3l10 18H2z M12 10v5 M12 18h.01',
  check: 'M5 12l5 5 9-10',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 8v4l3 2',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  trash: 'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name]} />
    </svg>
  )
}

/** Small brand mark + company name. */
export function Logo({ name = 'SSM Travel & Tours', className = '' }: { name?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold leading-tight text-brand ${className}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-white"><Icon name="logo" className="h-4 w-4" /></span>
      <span>{name}</span>
    </span>
  )
}
