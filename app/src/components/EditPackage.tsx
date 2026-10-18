import { useState, type FormEvent } from 'react'
import * as store from '../store'
import { useApp } from '../state'
import { DESTINATIONS, type Country, type Pkg } from '../types'
import { btn, btnGhost, inp } from './ui'
import { Dialog, Field } from './Dialog'

const COUNTRIES: Country[] = ['India', 'Nepal', 'Thailand', 'Bhutan']

/** Add a new package (no `pkg`) or change an existing one. */
export function EditPackage({ pkg, onClose }: { pkg?: Pkg; onClose: () => void }) {
  const { data } = useApp()
  const [f, setF] = useState({ name: pkg?.name ?? '', country: (pkg?.country ?? 'India') as Country, days: pkg?.days ?? 5, price: pkg?.price ?? 0, cost: pkg?.cost ?? 0, stops: pkg?.stops ?? ([] as string[]) })
  const [error, setError] = useState('')
  const toggle = (name: string) => setF((x) => ({ ...x, stops: x.stops.includes(name) ? x.stops.filter((s) => s !== name) : [...x.stops, name] }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return setError('Give the package a name.')
    if (f.days < 1) return setError('A trip is at least 1 day.')
    if (f.price <= 0) return setError('Enter the price per person.')
    if (f.cost < 0 || f.cost > f.price) return setError('The cost must be between 0 and the price.')
    if (!f.stops.length) return setError('Choose at least one place.')
    const row = { ...f, name: f.name.trim() }
    if (pkg) await store.patch('packages', pkg.id, row)
    else {
      const taken = new Set(data?.packages.map((p) => p.id))
      let id = ''
      do id = `${f.country.slice(0, 2).toUpperCase()}${f.days}-${Math.floor(Math.random() * 900 + 100)}`
      while (taken.has(id))
      await store.create('packages', { id, ...row })
    }
    onClose()
  }

  return (
    <Dialog title={pkg ? 'Edit package' : 'New package'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="India 8-Day · Buddhist Circuit" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country"><select className={inp} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value as Country })}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Days"><input className={inp} type="number" min={1} value={f.days || ''} onChange={(e) => setF({ ...f, days: Math.floor(+e.target.value) })} /></Field>
          <Field label="Price per person (Ks)"><input className={inp} type="number" min={0} value={f.price || ''} onChange={(e) => setF({ ...f, price: +e.target.value })} /></Field>
          <Field label="Cost per person (Ks)"><input className={inp} type="number" min={0} value={f.cost || ''} onChange={(e) => setF({ ...f, cost: +e.target.value })} /></Field>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Places visited, in order ({f.stops.length})</div>
          {f.stops.length > 0 && <p className="mt-1 text-sm text-ink-2">{f.stops.join(' → ')}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DESTINATIONS.map((d) => {
              const on = f.stops.includes(d.name)
              return <button type="button" key={d.name} aria-pressed={on} onClick={() => toggle(d.name)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${on ? 'bg-brand-solid text-white' : 'bg-slate-100 text-ink-2 hover:bg-slate-200'}`}>{d.name}</button>
            })}
          </div>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-ink">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btn}>{pkg ? 'Save changes' : 'Add package'}</button>
        </div>
      </form>
    </Dialog>
  )
}
