// Makes demo-data/2023.json: a made-up year of company data for presentations.
//
//   node demo-data/make-2023.mjs [YYYY-MM-DD]
//
// - A full year of history for 2023 (choose "Year 2023" at the top of the app to see the charts).
// - A small "live" slice dated around the day you run this (trips leaving soon, cases past their
//   deadline, passports about to expire), so Trips, alerts and the visa/passport boards have
//   something to show. Run it again on the day of a presentation to move the live slice to that day.
// Everything is invented; nothing comes from real customers.
import { writeFileSync } from 'node:fs'
import { buildShowcase } from '../app/src/demo.ts'

const live = process.argv[2] ?? new Date().toISOString().slice(0, 10)
if (!/^\d{4}-\d{2}-\d{2}$/.test(live)) throw new Error('Give the live day as YYYY-MM-DD')
const plus = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

const history = buildShowcase('2023-12-31')
const now = buildShowcase(live)

// ── pick the live slice ─────────────────────────────────────────────
const FINISHED = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']
const trips = now.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= plus(live, -3) && b.departDate <= plus(live, 60))
const enquiries = now.bookings.filter((b) => b.status === 'enquiry' && b.createdAt >= plus(live, -14))
const bookings = [...trips, ...enquiries]
const visas = now.visas.filter((c) => !FINISHED.includes(c.stage))
const passports = now.passports.filter((c) => !FINISHED.includes(c.stage))
const people = new Set([...bookings, ...visas, ...passports].map((r) => r.customerId))
// People whose passport is expired or about to expire, so the Customers filters and alerts show them.
for (const c of now.customers) if (c.passportExpiry && c.passportExpiry < plus(live, 180)) people.add(c.id)
const tickets = now.tickets.filter((t) => people.has(t.customerId) && t.date >= plus(live, -5) && t.date <= plus(live, 70))
const customers = now.customers.filter((c) => people.has(c.id))

// Names must not repeat across the two years.
const taken = new Set(history.customers.map((c) => c.name))
for (const c of customers) { while (taken.has(c.name)) c.name += ' II'; taken.add(c.name) }

const data = {
  customers: [...history.customers, ...customers],
  packages: history.packages,
  bookings: [...history.bookings, ...bookings],
  visas: [...history.visas, ...visas],
  passports: [...history.passports, ...passports],
  tickets: [...history.tickets, ...tickets],
}

// ── safety checks before writing ────────────────────────────────────
for (const [table, rows] of Object.entries(data)) {
  const ids = rows.map((r) => r.id)
  if (new Set(ids).size !== ids.length) throw new Error(`${table}: repeated ids`)
}
const customerIds = new Set(data.customers.map((c) => c.id))
const packageIds = new Set(data.packages.map((p) => p.id))
for (const b of data.bookings) if (!customerIds.has(b.customerId) || !packageIds.has(b.packageId)) throw new Error(`booking ${b.id} points at something missing`)
for (const r of [...data.visas, ...data.passports, ...data.tickets]) if (!customerIds.has(r.customerId)) throw new Error(`${r.id} points at a missing customer`)

writeFileSync(new URL('./2023.json', import.meta.url), JSON.stringify(data, null, 2) + '\n')
console.log(`demo-data/2023.json written (live day ${live}):`, Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])))
