import { useState } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { PASSPORT_KINDS, PASSPORT_STAGES, VISA_KINDS, VISA_STAGES, type Case } from '../types'
import { Card, Chart, Loading, Page, Stat, btn, daysBetween, formGrid, inp, today } from '../components/ui'
import { CustomerSelect } from '../components/CustomerSelect'

const CFG = {
  visa: { title: 'Visa services', stages: VISA_STAGES, done: ['Approved', 'Rejected', 'Delivered'], kinds: VISA_KINDS, table: 'visas' as const, defFee: 160_000 },
  passport: { title: 'Passport services', stages: PASSPORT_STAGES, done: ['Ready', 'Collected'], kinds: PASSPORT_KINDS, table: 'passports' as const, defFee: 180_000 },
}
const PAGE = 15

export default function Pipeline({ kind }: { kind: 'visa' | 'passport' }) {
  const { data, money } = useApp()
  const cfg = CFG[kind]
  const [form, setForm] = useState({ customerId: '', kind: cfg.kinds[0], fee: cfg.defFee, deadline: '' })
  const [showAll, setShowAll] = useState<string | null>(null)
  if (!data) return <Loading />
  const rows: Case[] = kind === 'visa' ? data.visas : data.passports
  const name = new Map(data.customers.map((c) => [c.id!, c.name]))
  const t = today()

  const finished = rows.filter((c) => c.decidedAt)
  const avgDays = finished.length ? finished.reduce((s, c) => s + daysBetween(c.appliedAt, c.decidedAt!), 0) / finished.length : 0
  const approved = rows.filter((c) => c.stage === 'Approved' || c.stage === 'Delivered').length
  const rejected = rows.filter((c) => c.stage === 'Rejected').length
  const open = rows.filter((c) => !cfg.done.includes(c.stage))
  const overdue = open.filter((c) => c.deadline && c.deadline < t)

  const move = async (c: Case, dir: -1 | 1) => {
    const i = cfg.stages.indexOf(c.stage) + dir
    if (i < 0 || i >= cfg.stages.length) return
    const stage = cfg.stages[i]
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
  }

  const perMonth = Object.entries(
    finished.reduce<Record<string, number>>((m, c) => { const k = c.decidedAt!.slice(0, 7); m[k] = (m[k] ?? 0) + 1; return m }, {}),
  ).sort().slice(-12)

  return (
    <Page title={cfg.title} sub="Move cases across stages with the arrows. Overdue deadlines are highlighted.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open cases" value={String(open.length)} />
        <Stat label="Overdue" value={String(overdue.length)} hint={overdue.length ? 'needs attention' : 'all on track'} />
        <Stat label="Avg turnaround" value={`${avgDays.toFixed(1)} d`} />
        {kind === 'visa'
          ? <Stat label="Approval rate" value={`${approved + rejected ? ((approved / (approved + rejected)) * 100).toFixed(0) : 0}%`} />
          : <Stat label="Fee revenue" value={money(rows.filter((c) => cfg.done.includes(c.stage)).reduce((s, c) => s + c.fee, 0), true)} />}
      </div>

      <Card title="New case">
        <form onSubmit={add} className={formGrid}>
          <CustomerSelect value={form.customerId} onChange={(id) => setForm({ ...form, customerId: id })} />
          <select className={inp} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{cfg.kinds.map((k) => <option key={k}>{k}</option>)}</select>
          <input className={`${inp} w-32`} type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: +e.target.value })} aria-label="Fee (Ks)" />
          <input className={inp} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} aria-label="Deadline" />
          <button className={btn}>Add</button>
        </form>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {cfg.stages.map((s) => {
          const col = rows.filter((c) => c.stage === s).sort((a, b) => (b.deadline ?? b.appliedAt).localeCompare(a.deadline ?? a.appliedAt))
          const shown = showAll === s ? col : col.slice(0, PAGE)
          return (
            <div key={s} className="w-64 shrink-0 rounded-2xl bg-slate-200/60 p-2">
              <div className="mb-2 flex justify-between px-1 text-sm font-semibold text-slate-700"><span>{s}</span><span className="rounded-full bg-white px-2 text-xs leading-5">{col.length}</span></div>
              <div className="space-y-2">
                {shown.map((c) => {
                  const late = c.deadline && c.deadline < t && !cfg.done.includes(c.stage)
                  return (
                    <div key={c.id} className={`rounded-xl border bg-white p-2 text-sm shadow-sm ${late ? 'border-rose-400' : 'border-slate-200'}`}>
                      <div className="font-medium">{name.get(c.customerId)}</div>
                      <div className="text-xs text-slate-500">{c.kind} · {money(c.fee)} · applied {c.appliedAt}</div>
                      {c.deadline && <div className={`text-xs ${late ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>due {c.deadline}</div>}
                      <div className="mt-1 flex justify-between">
                        <button aria-label="Move back" className="px-2 text-slate-500 hover:text-teal-700" onClick={() => move(c, -1)}>‹</button>
                        <button aria-label="Move forward" className="px-2 text-slate-500 hover:text-teal-700" onClick={() => move(c, 1)}>›</button>
                      </div>
                    </div>
                  )
                })}
                {col.length > PAGE && <button className="w-full text-xs text-teal-700" onClick={() => setShowAll(showAll === s ? null : s)}>{showAll === s ? 'Show less' : `+${col.length - PAGE} more`}</button>}
              </div>
            </div>
          )
        })}
      </div>

      <Card title="Completed per month">
        <Chart height={220} option={{ tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: perMonth.map(([m]) => m) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: perMonth.map(([, n]) => n), itemStyle: { borderRadius: [6, 6, 0, 0] } }] }} />
      </Card>
    </Page>
  )
}
