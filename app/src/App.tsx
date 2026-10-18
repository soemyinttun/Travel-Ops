import { Component, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './state'
import { SERVICES } from './types'
import type { Preset } from './analytics'
import { Loading } from './components/ui'
import { Icon, Logo, type IconName } from './components/Icon'
import Overview from './pages/Overview'
import Revenue from './pages/Revenue'
import Packages from './pages/Packages'
import Pipeline from './pages/Pipeline'
import Tickets from './pages/Tickets'
import Trips from './pages/Trips'
import Heatmaps from './pages/Heatmaps'
import Bookings from './pages/Bookings'
import Customers from './pages/Customers'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import More from './pages/More'
import CustomerDetail from './pages/CustomerDetail'
import { HeaderTools } from './components/HeaderTools'
import { useAuth } from './auth/AuthProvider'
import { usePendingCount } from './auth/admin'
import { useSyncStatus, requestSync } from './sync/controller'
import { companyDay } from './dates'

/** Every screen. The desktop side menu lists all of them; phones use the 5 tabs below plus "More". */
const NAV: readonly (readonly [string, string, IconName])[] = [
  ['/', 'Overview', 'overview'], ['/revenue', 'Revenue', 'revenue'], ['/packages', 'Packages', 'packages'],
  ['/visa', 'Visa', 'visa'], ['/passport', 'Passport', 'passport'], ['/tickets', 'Tickets', 'tickets'],
  ['/trips', 'Trips', 'trips'], ['/heatmaps', 'Heatmaps', 'heatmaps'], ['/bookings', 'Bookings', 'bookings'],
  ['/customers', 'Customers', 'customers'], ['/settings', 'Settings', 'settings'], ['/admin', 'Admin', 'admin'],
]
/** Screens that live under the "Ops" tab on a phone; everything else not in a tab sits under "More". */
const OPS = ['/visa', '/passport', '/tickets']
const TABS: readonly { to: string; label: string; icon: IconName; owns: (p: string) => boolean }[] = [
  { to: '/', label: 'Overview', icon: 'overview', owns: (p) => p === '/' },
  { to: '/trips', label: 'Trips', icon: 'compass', owns: (p) => p === '/trips' },
  { to: '/bookings', label: 'Bookings', icon: 'tickets', owns: (p) => p === '/bookings' },
  { to: '/visa', label: 'Ops', icon: 'ops', owns: (p) => OPS.includes(p) },
  { to: '/more', label: 'More', icon: 'more', owns: (p) => !['/', '/trips', '/bookings', ...OPS].includes(p) },
]

const pill = 'rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'

export default function App() {
  const { filters, setFilters, data, scoped, loadError } = useApp()
  // Calendar years that have sales, plus the selected one so the menu always shows it.
  const years = [...new Set([...scoped.map((s) => s.date.slice(0, 4)), ...(filters.preset.startsWith('y') ? [filters.preset.slice(1)] : [])])].sort().reverse()
  const { role, mode } = useAuth()
  const nav = NAV.filter(([to]) => to !== '/admin' || role === 'admin')
  const pending = usePendingCount(role === 'admin' && mode === 'cloud')
  const loc = useLocation()
  const here = NAV.find(([to]) => to === loc.pathname)?.[1] ?? (loc.pathname === '/more' ? 'More' : loc.pathname.startsWith('/customers/') ? 'Customers' : '')
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface p-2 md:flex md:w-16 lg:w-56 lg:p-3">
        <div className="mb-3 flex justify-center px-1 lg:justify-start lg:px-2"><Logo name="SSM Travel & Tours Co., Ltd." className="text-base [&>span:last-child]:hidden lg:[&>span:last-child]:inline" /></div>
        {nav.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => `flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm lg:justify-start lg:px-3 ${isActive ? 'bg-brand-mist font-semibold text-brand' : 'text-ink-2 hover:bg-slate-50'}`}>
            <span className="relative"><Icon name={icon} />{to === '/admin' && pending > 0 && <span className="lg:hidden"><Badge n={pending} floating /></span>}</span>
            <span className="hidden lg:inline">{label}</span>{to === '/admin' && pending > 0 && <span className="hidden lg:inline"><Badge n={pending} /></span>}
          </NavLink>
        ))}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="border-b border-line bg-surface/90 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="min-w-0">
              <Logo name="SSM TRAVEL" className="text-base tracking-wide" />
              {here && <div className="ml-9 -mt-0.5 text-[11px] font-medium text-slate-500">{here}</div>}
            </div>
            <div className="flex items-center gap-2"><SyncPill /><HeaderTools /></div>
          </div>
          <div className="mt-2 flex items-center gap-2 md:mt-0">
            <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 pb-0.5 md:flex-none md:overflow-visible">
              <span className={`${pill} shrink-0 text-slate-500`} title="Company day (Myanmar time)">Today {companyDay().slice(5)}</span>
              <select aria-label="Date range" className={`${pill} shrink-0`} value={filters.preset} onChange={(e) => setFilters({ preset: e.target.value as Preset })}>
                <option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
                <option value="12m">Last 12 months</option><option value="all">All time</option>
                {years.map((y) => <option key={y} value={`y${y}`}>Year {y}</option>)}
              </select>
              <select aria-label="Service" className={`${pill} shrink-0`} value={filters.service} onChange={(e) => setFilters({ service: e.target.value as typeof filters.service })}>
                <option value="All">All services</option>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Currency" className={`${pill} shrink-0 bg-brand-mist text-brand`} value={filters.currency} onChange={(e) => setFilters({ currency: e.target.value as 'USD' | 'MMK' })}>
                <option>USD</option><option>MMK</option>
              </select>
              {filters.dest && (
                <button className="shrink-0 rounded-full bg-amber-soft px-3 py-1.5 text-xs font-semibold text-amber-ink" onClick={() => setFilters({ dest: null })}>
                  Place: {filters.dest} ×
                </button>
              )}
            </div>
            <div className="ml-auto hidden items-center gap-2 md:flex"><SyncPill /><HeaderTools /></div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-6">
          {loadError && <div role="alert" className="mb-3 rounded-2xl bg-rose-soft p-4 text-sm text-rose-ink">{loadError}</div>}
          {!data ? <Loading /> : <Boundary key={loc.pathname}><Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/visa" element={<Pipeline kind="visa" />} />
            <Route path="/passport" element={<Pipeline kind="passport" />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/heatmaps" element={<Heatmaps />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/more" element={<More pending={pending} />} />
          </Routes></Boundary>}
        </main>

        <nav aria-label="Main menu" className="fixed inset-x-0 bottom-0 z-[1000] flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {TABS.map((t) => {
            const on = t.owns(loc.pathname)
            return (
              <NavLink key={t.to} to={t.to} aria-current={on ? 'page' : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-2 pt-2 text-[11px] font-medium ${on ? 'font-semibold text-brand' : 'text-slate-500'}`}>
                <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition ${on ? 'bg-brand-mist' : ''}`}>
                  <Icon name={t.icon} />{t.to === '/more' && pending > 0 && <Badge n={pending} floating />}
                </span>
                {t.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/** Small count bubble: people waiting for admin approval. */
function Badge({ n, floating = false }: { n: number; floating?: boolean }) {
  return <span aria-label={`${n} waiting for approval`} className={`${floating ? 'absolute -right-1 -top-1' : 'ml-1'} inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber px-1 text-[11px] font-semibold leading-5 text-white`}>{n}</span>
}

class Boundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {}
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (this.state.err) return <div className="rounded-2xl bg-rose-soft p-6 text-rose-ink">Something went wrong on this page: {this.state.err.message}</div>
    return this.props.children
  }
}

/** Header badge: sync state with cloud sync, or online/offline in local-only mode. */
function SyncPill() {
  const sync = useSyncStatus()
  const online = useOnline()
  const base = 'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold'
  if (sync.state === 'off')
    return <span className={`${base} ${online ? 'bg-emerald-soft text-emerald-ink' : 'bg-slate-800 text-white'}`}>{online ? 'Online' : 'Offline mode'}</span>
  const [cls, text] =
    sync.state === 'synced' ? ['bg-emerald-soft text-emerald-ink', sync.pending ? `Synced · ${sync.pending} waiting` : 'Synced']
    : sync.state === 'syncing' ? ['bg-sky-soft text-sky-700', 'Syncing…']
    : sync.state === 'offline' ? ['bg-slate-800 text-white', sync.pending ? `Offline · ${sync.pending} waiting` : 'Offline']
    : ['bg-rose-soft text-rose-ink', 'Sync problem · retry']
  return <button className={`${base} ${cls}`} title={sync.error ?? (sync.lastSynced ? `Last synced ${new Date(sync.lastSynced).toLocaleTimeString()}` : undefined)} onClick={() => void requestSync()}>{text}</button>
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine)
  useEffect(() => {
    const u = () => setOn(true), d = () => setOn(false)
    window.addEventListener('online', u); window.addEventListener('offline', d)
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', d) }
  }, [])
  return on
}
