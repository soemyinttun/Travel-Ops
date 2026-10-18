import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/** Colour meaning from the design reference: tickets indigo, visa amber, urgent rose, done emerald, transit sky. */
export type Tone = 'brand' | 'amber' | 'rose' | 'emerald' | 'indigo' | 'sky' | 'slate'

const CHIP: Record<Tone, string> = {
  brand: 'bg-brand-mist text-brand border-teal-100',
  amber: 'bg-amber-soft text-amber-ink border-amber-200',
  rose: 'bg-rose-soft text-rose-ink border-rose-200',
  emerald: 'bg-emerald-soft text-emerald-ink border-emerald-200',
  indigo: 'bg-indigo-soft text-indigo-700 border-indigo-200',
  sky: 'bg-sky-soft text-sky-700 border-sky-200',
  slate: 'bg-slate-200 text-slate-800 border-slate-300',
}
const TILE: Record<Tone, string> = {
  brand: 'bg-brand-mist text-brand',
  amber: 'bg-amber-soft text-amber-ink',
  rose: 'bg-rose-soft text-rose-ink',
  emerald: 'bg-emerald-soft text-emerald-ink',
  indigo: 'bg-indigo-soft text-indigo-700',
  sky: 'bg-sky-soft text-sky-700',
  slate: 'bg-slate-100 text-slate-600',
}
const INK: Record<Tone, string> = {
  brand: 'text-brand', amber: 'text-amber-ink', rose: 'text-rose-ink', emerald: 'text-emerald-ink',
  indigo: 'text-indigo-700', sky: 'text-sky-700', slate: 'text-ink',
}
const BAR: Record<Tone, string> = {
  brand: 'bg-brand', amber: 'bg-amber', rose: 'bg-rose', emerald: 'bg-emerald', indigo: 'bg-indigo', sky: 'bg-sky', slate: 'bg-slate-500',
}

/** Small round status label. */
export function Chip({ tone = 'slate', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${CHIP[tone]} ${className}`}>{children}</span>
}

/** Rounded square holding an icon. */
export function IconTile({ name, tone = 'brand', className = '' }: { name: IconName; tone?: Tone; className?: string }) {
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TILE[tone]} ${className}`}><Icon name={name} /></span>
}

/** Round initials badge. */
export function Avatar({ name, tone = 'brand' }: { name: string; tone?: Tone }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  return <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${TILE[tone]}`}>{initials}</span>
}

/** Page top: small caps line, big title, one main action on the right. */
export function PageHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wider text-brand">{eyebrow}</div>}
        <h1 className="text-xl font-bold leading-tight text-ink sm:text-2xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/** Main action button with an icon, as in the reference ("+ New enquiry"). */
export function ActionButton({ icon = 'plus', children, onClick, type = 'button', tone = 'brand', className = '' }: { icon?: IconName; children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; tone?: 'brand' | 'rose' | 'amber' | 'soft'; className?: string }) {
  const cls = {
    brand: 'bg-brand text-white hover:bg-brand-deep',
    rose: 'bg-rose text-white hover:bg-rose-ink',
    amber: 'bg-amber-ink text-white hover:bg-amber-ink/90',
    soft: 'bg-indigo-soft/60 text-brand hover:bg-indigo-soft',
  }[tone]
  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${cls} ${className}`}>
      <Icon name={icon} className="h-4 w-4" />{children}
    </button>
  )
}

/** Number card with an icon in the corner. tone="rose" makes it a warning card. */
export function StatTile({ label, value, note, icon, tone = 'slate', delta }: { label: string; value: string; note?: ReactNode; icon?: IconName; tone?: Tone; delta?: number }) {
  const warn = tone === 'rose'
  return (
    <div className={`min-w-0 rounded-2xl border p-3 shadow-sm sm:p-4 ${warn ? 'border-rose bg-rose-soft/40' : 'border-line bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`text-[11px] font-semibold uppercase tracking-wider ${tone === 'amber' ? 'text-amber-ink' : warn ? 'text-rose-ink' : 'text-slate-500'}`}>{label}</div>
        {icon && <IconTile name={icon} tone={tone === 'slate' ? 'brand' : tone} className="!h-8 !w-8 !rounded-lg" />}
      </div>
      <div className={`num mt-1 truncate text-2xl font-bold sm:text-3xl ${warn ? 'text-rose-ink' : tone === 'amber' ? INK.amber : INK.slate}`}>{value}</div>
      <div className="mt-1 min-h-4 text-xs text-slate-500">
        {delta !== undefined && (
          <span className={`mr-1 font-semibold ${delta >= 0 ? 'text-emerald-ink' : 'text-rose-ink'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>
        )}
        {note}
      </div>
    </div>
  )
}

export interface ChipOption<T extends string> { value: T; label: string; count?: number }

/** Row of filter pills that scrolls sideways on narrow screens. */
export function FilterChips<T extends string>({ options, value, onChange }: { options: readonly ChipOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${on ? 'bg-brand text-white' : 'bg-indigo-soft/60 text-ink-2 hover:bg-indigo-soft'}`}>
            {o.label}
            {o.count !== undefined && <span className={`num rounded-full px-1.5 text-xs ${on ? 'bg-white/20' : 'bg-white/70'}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Search box with a magnifier. */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
      <Icon name="search" className="h-5 w-5 shrink-0 text-slate-500" />
      <input aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 md:text-sm" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/** A label, a value and a bar showing its share. */
export function ProgressRow({ label, value, pct, tone = 'brand', right }: { label: string; value: string; pct: number; tone?: Tone; right?: ReactNode }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-ink">{label}</span>
        <span className="num shrink-0 text-ink-2"><b className="font-semibold text-ink">{value}</b> {right}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-indigo-soft/60" role="img" aria-label={`${label}: ${w.toFixed(0)}%`}>
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  )
}

/** Pale band inside a card that holds the key facts (route, date, passport...). */
export function Strip({ children, tone = 'sky', className = '' }: { children: ReactNode; tone?: 'sky' | 'rose' | 'amber' | 'brand'; className?: string }) {
  const c = { sky: 'bg-sky-soft/50', rose: 'bg-rose-soft/60 text-rose-ink', amber: 'bg-amber-soft/70 text-amber-ink', brand: 'bg-brand-mist' }[tone]
  return <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 text-sm ${c} ${className}`}>{children}</div>
}

/** A white card for one record (booking, customer, case...). `urgent` draws the rose edge. */
export function RecordCard({ children, urgent = false }: { children: ReactNode; urgent?: boolean }) {
  return <article className={`min-w-0 space-y-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4 ${urgent ? 'border-[1.5px] border-rose' : 'border border-line'}`}>{children}</article>
}

/** Soft information box shown when there is nothing to show, or as a footer note. */
export function Hint({ icon = 'check', title, children, tone = 'sky' }: { icon?: IconName; title: string; children?: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-3 sm:p-4">
      <IconTile name={icon} tone={tone} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{title}</div>
        {children && <div className="mt-0.5 text-sm text-slate-500">{children}</div>}
      </div>
    </div>
  )
}

/** Section label with a coloured dot and a count, as on the "More" screen. */
export function SectionLabel({ tone = 'brand', children, right }: { tone?: Tone; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink"><span className={`h-2 w-2 rounded-full ${BAR[tone]}`} />{children}</h2>
      {right && <span className="text-xs text-slate-500">{right}</span>}
    </div>
  )
}
