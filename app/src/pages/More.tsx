import { Link } from 'react-router-dom'
import { useApp } from '../state'
import { useAuth } from '../auth/AuthProvider'
import { Loading } from '../components/ui'
import { Icon, type IconName } from '../components/Icon'
import { Chip, IconTile, PageHead, SectionLabel, type Tone } from '../components/kit'
import { versionLabel } from '../version'

interface Entry { to: string; title: string; text: string; icon: IconName; tone: Tone; chip?: string; chipTone?: Tone }

/** The "More" screen: every part of the app in groups, with a live count where it helps. */
export default function More({ pending = 0 }: { pending?: number }) {
  const { data } = useApp()
  const { role } = useAuth()
  if (!data) return <Loading />
  const openVisa = data.visas.filter((c) => !['Approved', 'Delivered', 'Rejected'].includes(c.stage)).length
  const openPassport = data.passports.filter((c) => !['Ready', 'Collected'].includes(c.stage)).length

  const groups: { title: string; tone: Tone; right: string; items: Entry[] }[] = [
    { title: 'Sales & revenue', tone: 'brand', right: 'Money and customers', items: [
      { to: '/revenue', title: 'Revenue', text: 'Money by service, country, trip length and town. Compare two things.', icon: 'revenue', tone: 'brand' },
      { to: '/packages', title: 'Packages', text: 'Trip lengths, prices, costs and profit. Edit prices here.', icon: 'packages', tone: 'brand', chip: `${data.packages.length} packages` },
      { to: '/customers', title: 'Customers', text: 'Phone, home town and passport dates.', icon: 'customers', tone: 'amber', chip: `${data.customers.length} customers`, chipTone: 'amber' },
    ] },
    { title: 'Services', tone: 'amber', right: 'Visa, passport, tickets', items: [
      { to: '/visa', title: 'Visa', text: 'Each visa case, step by step, with deadlines.', icon: 'visa', tone: 'amber', chip: openVisa ? `${openVisa} open` : undefined, chipTone: 'amber' },
      { to: '/passport', title: 'Passport', text: 'Passport applications and renewals.', icon: 'passport', tone: 'rose', chip: openPassport ? `${openPassport} open` : undefined, chipTone: 'rose' },
      { to: '/tickets', title: 'Air tickets', text: 'Inbound and outbound tickets and commission.', icon: 'tickets', tone: 'indigo', chip: `${data.tickets.length} tickets`, chipTone: 'indigo' },
    ] },
    { title: 'Data & planning', tone: 'slate', right: '1 view', items: [
      { to: '/heatmaps', title: 'Heatmaps', text: 'Busy months and where customers come from.', icon: 'heatmaps', tone: 'sky' },
    ] },
    { title: 'System', tone: 'slate', right: role === 'admin' ? '2 controls' : '1 control', items: [
      ...(role === 'admin' ? [{ to: '/admin', title: 'Admin', text: 'Import data, approve staff, backups, connection check.', icon: 'admin' as IconName, tone: 'emerald' as Tone, chip: pending ? `${pending} waiting` : undefined, chipTone: 'amber' as Tone }] : []),
      { to: '/settings', title: 'Settings', text: 'Currency, backup, install the app, account.', icon: 'settings', tone: 'slate' },
    ] },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHead eyebrow="All screens" title="More" sub="Everything else in the app." />
      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <SectionLabel tone={g.tone} right={g.right}>{g.title}</SectionLabel>
          {g.items.map((it) => (
            <Link key={it.to} to={it.to} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm transition active:scale-[0.99] hover:border-brand/40">
              <IconTile name={it.icon} tone={it.tone} className="!h-11 !w-11" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold text-ink">{it.title}</span>{it.chip && <Chip tone={it.chipTone}>{it.chip}</Chip>}</div>
                <p className="truncate text-sm text-slate-500">{it.text}</p>
              </div>
              <Icon name="chevron" className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          ))}
        </section>
      ))}
      <p className="px-1 text-center text-xs text-slate-400">SSM Travel Ops · {versionLabel()}</p>
    </div>
  )
}
