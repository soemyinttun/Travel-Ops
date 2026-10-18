import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../store'
import { useApp } from '../state'
import { PASSPORT_KINDS, PASSPORT_STAGES, VISA_KINDS, VISA_STAGES, type Case } from '../types'
import { Card, Chart, Loading, btn, btnGhost, daysBetween, formGrid, inp, today } from '../components/ui'
import { Icon } from '../components/Icon'
import { ActionButton, Avatar, Chip, FilterChips, Hint, PageHead, RecordCard, StatTile, Strip } from '../components/kit'
import { CustomerSelect } from '../components/CustomerSelect'
import { EditCase } from '../components/EditDialogs'
import { smsLink } from '../contact'

const CFG = {
  visa: { title: 'Visa', eyebrow: 'Visa services', stages: VISA_STAGES, done: ['Approved', 'Rejected', 'Delivered'], kinds: VISA_KINDS, table: 'visas' as const, defFee: 160_000 },
  passport: { title: 'Passport', eyebrow: 'Passport services', stages: PASSPORT_STAGES, done: ['Ready', 'Collected'], kinds: PASSPORT_KINDS, table: 'passports' as const, defFee: 180_000 },
}
const SHOWN = 30
type View = 'open' | 'overdue' | 'done' | 'all'

export default function Pipeline({ kind }: { kind: 'visa' | 'passport' }) {
  const { data, money } = useApp()
  const cfg = CFG[kind]
  const [form, setForm] = useState({ customerId: '', kind: cfg.kinds[0], fee: cfg.defFee, deadline: '' })
  const [picked, setView] = useState<View | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Case | null>(null)
  const [more, setMore] = useState(SHOWN)
  if (!data) return <Loading />
  const rows: Case[] = kind === 'visa' ? data.visas : data.passports
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const t = today()

  const finished = rows.filter((c) => c.decidedAt)
  const avgDays = finished.length ? finished.reduce((s, c) => s + daysBetween(c.appliedAt, c.decidedAt!), 0) / finished.length : 0
  const approved = rows.filter((c) => c.stage === 'Approved' || c.stage === 'Delivered').length
  const rejected = rows.filter((c) => c.stage === 'Rejected').length
  // Until a filter is chosen, show open cases, or everything when none are open.
  const view: View = picked ?? (rows.some((c) => !cfg.done.includes(c.stage)) ? 'open' : 'all')
  const isDone = (c: Case) => cfg.done.includes(c.stage)
  const open = rows.filter((c) => !isDone(c))
  const isLate = (c: Case) => !isDone(c) && !!c.deadline && c.deadline < t
  const overdue = open.filter(isLate)

  const setStage = async (c: Case, stage: string) => {
    if (!cfg.stages.includes(stage as never) || stage === c.stage) return
    await store.patch(cfg.table, c.id, { stage, decidedAt: cfg.done.includes(stage) ? c.decidedAt ?? t : undefined })
  }
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.customerId === '') return
    await store.create(cfg.table, {
      customerId: form.customerId, kind: form.kind, stage: cfg.stages[0], appliedAt: t,
      fee: form.fee, cost: Math.round(form.fee * 0.55), deadline: form.deadline || undefined,
    })
    setForm({ ...form, customerId: '', deadline: '' })
    setAdding(false)
  }

  const shownRows = rows
    .filter((c) => view === 'all' || (view === 'open' && !isDone(c)) || (view === 'overdue' && isLate(c)) || (view === 'done' && isDone(c)))
    .sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || b.appliedAt.localeCompare(a.appliedAt))
  const list = shownRows.slice(0, more)
  const perMonth = Object.entries(
    finished.reduce<Record<string, number>>((m, c) => { const k = c.decidedAt!.slice(0, 7); m[k] = (m[k] ?? 0) + 1; return m }, {}),
  ).sort().slice(-12)

  return (
    <div className="space-y-4">
      <PageHead eyebrow={cfg.eyebrow} title={cfg.title} sub="Every case, urgent ones first. Change the step with the menu on each card."
        action={<ActionButton icon={adding ? 'chevron' : 'plus'} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'New case'}</ActionButton>} />

      {adding && (
        <Card title="New case">
          <form onSubmit={add} className={formGrid}>
            <CustomerSelect value={form.customerId} onChange={(id) => setForm({ ...form, customerId: id })} />
            <select className={inp} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{cfg.kinds.map((k) => <option key={k}>{k}</option>)}</select>
            <input className={`${inp} w-32`} type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: +e.target.value })} aria-label="Fee (Ks)" />
            <input className={inp} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} aria-label="Deadline" />
            <button className={btn}>Add</button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open cases" value={String(open.length)} icon={kind === 'visa' ? 'visa' : 'passport'} tone="brand" note="in progress" />
        <StatTile label="Overdue" value={String(overdue.length)} icon="alert" tone={overdue.length ? 'rose' : 'slate'} note={overdue.length ? 'needs attention' : 'all on track'} />
        <StatTile label="Avg turnaround" value={`${avgDays.toFixed(1)} d`} icon="clock" tone="sky" note="apply to decision" />
        {kind === 'visa'
          ? <StatTile label="Approval rate" value={`${approved + rejected ? ((approved / (approved + rejected)) * 100).toFixed(0) : 0}%`} icon="check" tone="emerald" note={`${approved} approved`} />
          : <StatTile label="Fee revenue" value={money(rows.filter(isDone).reduce((s, c) => s + c.fee, 0), true)} icon="revenue" tone="emerald" note="finished cases" />}
      </div>

      <FilterChips value={view} onChange={(v) => { setView(v); setMore(SHOWN) }} options={[
        { value: 'open', label: 'Open', count: open.length },
        { value: 'overdue', label: 'Overdue', count: overdue.length },
        { value: 'done', label: 'Finished', count: rows.length - open.length },
        { value: 'all', label: 'All', count: rows.length },
      ]} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const late = isLate(c)
          const next = cfg.stages[cfg.stages.indexOf(c.stage) + 1]
          const left = c.deadline ? daysBetween(t, c.deadline) : null
          const cust = data.customers.find((x) => x.id === c.customerId)
          return (
            <RecordCard key={c.id} urgent={late}>
              <div className="flex items-start gap-3">
                <Avatar name={name.get(c.customerId) ?? '?'} tone={late ? 'rose' : kind === 'visa' ? 'amber' : 'indigo'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{name.get(c.customerId) ?? 'Unknown customer'}</div>
                  <div className="truncate text-sm text-slate-500">{c.kind}</div>
                </div>
                {left !== null && !isDone(c) && <Chip tone={late ? 'rose' : left <= 7 ? 'amber' : 'slate'}>{late ? `${-left}d late` : `${left}d left`}</Chip>}
                {isDone(c) && <Chip tone="emerald">{c.stage}</Chip>}
              </div>
              <Strip tone={late ? 'rose' : 'sky'}>
                <span className="inline-flex items-center gap-2 font-medium"><Icon name="revenue" className="h-4 w-4" /><span className="num">{money(c.fee)}</span></span>
                <span className="inline-flex items-center gap-1.5"><Icon name="trips" className="h-4 w-4" />applied {c.appliedAt}{c.deadline ? ` · due ${c.deadline}` : ''}</span>
              </Strip>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Step
                <select aria-label={`Step for ${name.get(c.customerId) ?? 'case'}`} className={`${inp} mt-1 w-full bg-indigo-soft/40 !text-sm font-medium normal-case tracking-normal text-ink`} value={c.stage} onChange={(e) => void setStage(c, e.target.value)}>
                  {cfg.stages.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-soft/60 px-3 py-2 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft" onClick={() => setEditing(c)}><Icon name="edit" className="h-4 w-4" />Edit</button>
                {cust?.phone && !isDone(c) && <a className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-soft/60 px-3 py-2 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft" href={smsLink(cust.phone, `Hello ${cust.name}, this is SSM Travel & Tours about your ${kind} (${c.kind}). Current step: ${c.stage}.${c.deadline ? ` Deadline: ${c.deadline}.` : ''} Please send any missing documents.`)}>Remind</a>}
                <Link className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-soft/60 px-3 py-2 text-sm font-semibold text-brand transition active:scale-95 hover:bg-indigo-soft" to={`/customers/${c.customerId}`}>Dossier</Link>
              </div>
              {next && !isDone(c) && <ActionButton icon="chevron" tone={late ? 'rose' : 'brand'} className="w-full" onClick={() => void setStage(c, next)}>Move to {next}</ActionButton>}
            </RecordCard>
          )
        })}
      </div>

      {editing && <EditCase kind={kind} row={editing} onClose={() => setEditing(null)} />}
      {!list.length && <Hint icon="check" tone="emerald" title={view === 'overdue' ? 'Nothing overdue' : 'No cases here'}>{view === 'overdue' ? 'Every open case is within its deadline.' : 'Try another filter, or add a new case.'}</Hint>}
      {shownRows.length > list.length && <div className="text-center"><button className={btnGhost} onClick={() => setMore((n) => n + SHOWN)}>Show more ({shownRows.length - list.length} left)</button></div>}

      <Card title="Completed per month">
        <Chart height={220} option={{ tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: perMonth.map(([m]) => m) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: perMonth.map(([, n]) => n), itemStyle: { borderRadius: [6, 6, 0, 0] } }] }} />
      </Card>
    </div>
  )
}
