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
    <span className={`inline-flex items-center gap-2 font-bold leading-tight text-teal-800 ${className}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white"><Icon name="logo" className="h-4 w-4" /></span>
      <span>{name}</span>
    </span>
  )
}
