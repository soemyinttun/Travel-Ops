import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state'
import { useAuth } from '../auth/AuthProvider'
import { computeAlerts } from '../alerts'
import { today } from './ui'
import { useTheme } from '../theme'
import { Icon } from './Icon'

/** Pop-up that closes when you tap anywhere outside it. */
function Popover({ button, children, label }: { button: ReactNode; children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="relative">{button}</button>
      {open && (
        <>
          <button aria-label="Close" className="fixed inset-0 z-[1500] cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-[1600] mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-surface p-2 shadow-lg" onClick={() => setOpen(false)}>{children}</div>
        </>
      )}
    </div>
  )
}

const row = 'flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-slate-50'

/** The bell (things that need action) and the account circle in the top bar. */
export function HeaderTools() {
  const { data } = useApp()
  const auth = useAuth()
  const { resolved, toggle } = useTheme()
  const alerts = useMemo(() => (data ? computeAlerts(data, today()) : null), [data])
  const name = new Map(data?.customers.map((c) => [c.id, c.name]))
  const initials = (auth.email ?? 'SSM').slice(0, 2).toUpperCase()
  const count = alerts?.total ?? 0
  const trips = alerts?.soon.filter((b) => b.departDate <= new Date(Date.parse(`${today()}T00:00:00Z`) + 3 * 86_400_000).toISOString().slice(0, 10)) ?? []

  return (
    <div className="flex items-center gap-2">
      <button aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={resolved === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition active:scale-95 hover:bg-slate-50">
        <Icon name={resolved === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
      </button>
      <Popover label={`Alerts${count ? `, ${count} need action` : ''}`} button={
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition active:scale-95 hover:bg-slate-50">
          <Icon name="alert" className="h-5 w-5" />
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">{count}</span>}
        </span>
      }>
        <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Needs action</div>
        {alerts && alerts.overdue.slice(0, 4).map((c) => (
          <Link key={c.id} to={c.type === 'Visa' ? '/visa' : '/passport'} className={row}>
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose" />
            <span><b className="font-semibold text-ink">{c.type} case overdue</b><span className="block text-slate-500">{name.get(c.customerId) ?? 'Customer'} · was due {c.deadline}</span></span>
          </Link>
        ))}
        {alerts && alerts.passportRisk.slice(0, 4).map(({ booking, customer }) => (
          <Link key={booking.id} to={`/customers/${customer.id}`} className={row}>
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber" />
            <span><b className="font-semibold text-ink">Passport under 6 months</b><span className="block text-slate-500">{customer.name} · leaves {booking.departDate}</span></span>
          </Link>
        ))}
        {trips.slice(0, 3).map((b) => (
          <Link key={b.id} to="/trips" className={row}>
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-solid" />
            <span><b className="font-semibold text-ink">Trip leaving soon</b><span className="block text-slate-500">{name.get(b.customerId) ?? 'Customer'} · {b.departDate}</span></span>
          </Link>
        ))}
        {!count && !trips.length && <p className="px-3 py-4 text-center text-sm text-slate-500">All clear. Nothing needs action.</p>}
        <Link to="/" className="mt-1 block rounded-xl bg-brand-mist px-3 py-2 text-center text-sm font-semibold text-brand">Open Overview</Link>
      </Popover>

      <Popover label="Account" button={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-solid text-sm font-bold text-white transition active:scale-95">{initials}</span>}>
        <div className="px-3 py-2">
          <div className="truncate text-sm font-semibold text-ink">{auth.email ?? 'This device'}</div>
          <div className="text-xs text-slate-500">{auth.mode === 'cloud' ? `Role: ${auth.role}` : 'Local mode, data stays on this device'}</div>
        </div>
        <Link to="/settings" className={row}>Settings</Link>
        {auth.role === 'admin' && <Link to="/admin" className={row}>Admin</Link>}
        {auth.mode === 'cloud' && <button className={`${row} w-full text-left text-rose-ink`} onClick={() => void auth.signOut()}>Sign out</button>}
      </Popover>
    </div>
  )
}
