import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import { companyDay } from '../dates'
import { useTheme } from '../theme'

// Chart series colours: brand teal first, then the status colours from the design reference.
export const COLORS = ['#0f766e', '#f59e0b', '#6366f1', '#e11d48', '#0ea5e9', '#10b981']
// 16px text on phones stops iPhones zooming in when a box is tapped; bigger tap targets on touch screens.
export const inp = 'min-w-0 max-w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-base text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand md:py-1.5 md:text-sm'
/** Form rows: one column on phones, two on small tablets, one wrapped row on wide screens. */
export const formGrid = 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center'
export const btn = 'rounded-lg bg-brand-solid px-3 py-2 text-sm font-medium text-white hover:bg-brand-deep active:scale-95 transition'
export const btnGhost = 'rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-ink-2 hover:bg-slate-50 active:scale-95 transition'

export function Page({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 [&>*]:min-w-0">
        <div>
          <h1 className="text-lg font-semibold text-ink sm:text-xl">{title}</h1>
          {sub && <p className="text-sm text-slate-500">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink-2">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="num mt-1 truncate text-xl font-bold text-ink sm:text-2xl">{value}</div>
      <div className="mt-1 h-4 text-xs">
        {delta !== undefined && (
          <span className={delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% <span className="text-slate-400">vs prev</span>
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Chart({ option, height = 280, onClick }: { option: any; height?: number; onClick?: (p: any) => void }) {
  const { resolved } = useTheme()
  return (
    <ReactECharts
      theme={resolved === 'dark' ? 'dark' : undefined}
      option={{ backgroundColor: 'transparent', color: COLORS, textStyle: { fontFamily: 'inherit' }, grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true }, ...option }}
      style={{ height }}
      notMerge
      onEvents={onClick ? { click: onClick } : undefined}
    />
  )
}

export function Seg<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-300 bg-surface text-sm">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`whitespace-nowrap px-3 py-2 transition md:py-1.5 ${o === value ? 'bg-brand-solid text-white' : 'text-ink-2 hover:bg-slate-50'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function Loading() {
  return <div className="p-8 text-center text-slate-500">Loading data…</div>
}

/** Today's date in the company's time zone (Myanmar), as YYYY-MM-DD. */
export const today = () => companyDay()
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
