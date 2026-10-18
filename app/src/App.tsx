import { Component, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './state'
import { SERVICES } from './types'
import type { Preset } from './analytics'
import { Loading, inp } from './components/ui'
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
import { useAuth } from './auth/AuthProvider'
import { usePendingCount } from './auth/admin'
import { useSyncStatus, requestSync } from './sync/controller'

const NAV: readonly (readonly [string, string, IconName])[] = [
  ['/', 'Overview', 'overview'], ['/revenue', 'Revenue', 'revenue'], ['/packages', 'Packages', 'packages'],
  ['/visa', 'Visa', 'visa'], ['/passport', 'Passport', 'passport'], ['/tickets', 'Tickets', 'tickets'],
  ['/trips', 'Trips', 'trips'], ['/heatmaps', 'Heatmaps', 'heatmaps'], ['/bookings', 'Bookings', 'bookings'],
  ['/customers', 'Customers', 'customers'], ['/settings', 'Settings', 'settings'], ['/admin', 'Admin', 'admin'],
]

export default function App() {
  const { filters, setFilters, data, scoped, loadError } = useApp()
  // Calendar years that have sales, plus the selected one so the menu always shows it.
  const years = [...new Set([...scoped.map((s) => s.date.slice(0, 4)), ...(filters.preset.startsWith('y') ? [filters.preset.slice(1)] : [])])].sort().reverse()
  const { role, mode } = useAuth()
  const nav = NAV.filter(([to]) => to !== '/admin' || role === 'admin')
  const pending = usePendingCount(role === 'admin' && mode === 'cloud')
  const loc = useLocation()
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white p-2 md:flex md:w-16 lg:w-56 lg:p-3">
        <div className="mb-3 flex justify-center px-1 lg:justify-start lg:px-2"><Logo name="SSM Travel & Tours Co., Ltd." className="text-base [&>span:last-child]:hidden lg:[&>span:last-child]:inline" /></div>
        {nav.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => `flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm lg:justify-start lg:px-3 ${isActive ? 'bg-teal-50 font-medium text-teal-800' : 'text-slate-600 hover:bg-slate-50'}`}>
            <span className="relative"><Icon name={icon} />{to === '/admin' && pending > 0 && <span className="lg:hidden"><Badge n={pending} floating /></span>}</span>
            <span className="hidden lg:inline">{label}</span>{to === '/admin' && pending > 0 && <span className="hidden lg:inline"><Badge n={pending} /></span>}
          </NavLink>
        ))}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-6">
          <span className="md:hidden"><Logo name="SSM Travel" /></span>
          <div className="order-last flex w-full flex-wrap items-center gap-2 md:order-none md:w-auto">
          <select aria-label="Date range" className={`${inp} min-w-0 flex-1 sm:flex-none`} value={filters.preset} onChange={(e) => setFilters({ preset: e.target.value as Preset })}>
            <option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option><option value="all">All time</option>
            {years.map((y) => <option key={y} value={`y${y}`}>Year {y}</option>)}
          </select>
          <select aria-label="Service" className={`${inp} min-w-0 flex-1 sm:flex-none`} value={filters.service} onChange={(e) => setFilters({ service: e.target.value as typeof filters.service })}>
            <option value="All">All services</option>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Currency" className={`${inp} min-w-0 flex-none`} value={filters.currency} onChange={(e) => setFilters({ currency: e.target.value as 'USD' | 'MMK' })}>
            <option>USD</option><option>MMK</option>
          </select>
          {filters.dest && (
            <button className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800" onClick={() => setFilters({ dest: null })}>
              Place: {filters.dest} ×
            </button>
          )}
          </div>
          <SyncPill />
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-6">
          {loadError && <div role="alert" className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{loadError}</div>}
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Routes></Boundary>}
        </main>

        <nav aria-label="Main menu" className="fixed inset-x-0 bottom-0 z-[1000] flex overflow-x-auto overscroll-x-contain border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-w-[4.5rem] flex-col items-center gap-0.5 px-2 py-2 text-[11px] ${isActive ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-500'}`}>
              <span className="relative"><Icon name={icon} />{to === '/admin' && pending > 0 && <Badge n={pending} floating />}</span>{label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Small count bubble: people waiting for admin approval. */
function Badge({ n, floating = false }: { n: number; floating?: boolean }) {
  return <span aria-label={`${n} waiting for approval`} className={`${floating ? 'absolute -right-3 -top-2' : 'ml-1'} inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold leading-5 text-white`}>{n}</span>
}

class Boundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {}
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (this.state.err) return <div className="rounded-2xl bg-rose-50 p-6 text-rose-800">Something went wrong on this page: {this.state.err.message}</div>
    return this.props.children
  }
}

/** Header badge: sync state with cloud sync, or online/offline in local-only mode. */
function SyncPill() {
  const sync = useSyncStatus()
  const online = useOnline()
  const base = 'ml-auto rounded-full px-2 py-0.5 text-xs'
  if (sync.state === 'off')
    return <span className={`${base} ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-800 text-white'}`}>{online ? 'Online' : 'Offline mode'}</span>
  const [cls, text] =
    sync.state === 'synced' ? ['bg-emerald-100 text-emerald-700', sync.pending ? `Synced · ${sync.pending} waiting` : 'Synced']
    : sync.state === 'syncing' ? ['bg-sky-100 text-sky-700', 'Syncing…']
    : sync.state === 'offline' ? ['bg-slate-800 text-white', sync.pending ? `Offline · ${sync.pending} waiting` : 'Offline']
    : ['bg-rose-100 text-rose-700', 'Sync problem · retry']
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
