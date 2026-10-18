import type { Booking, BookingStatus, Case, Customer, Data, Pkg, Ticket } from './types'

/**
 * Made-up presentation data for showing the app to other people. Every name, phone number and
 * amount is invented. Dates are worked out from "today", so a demo always has trips leaving this
 * week, cases past their deadline, passports about to expire and a busy year of sales behind it.
 * The same day always gives the same data.
 */

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const minDay = (a: string, b: string) => (a < b ? a : b)
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`)
const plus = (d: string, n: number) => iso(toMs(d) + n * DAY)

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MALE = ['Aung Min', 'Zaw Lin', 'Kyaw Zin', 'Htet Aung', 'Min Thu', 'Soe Moe', 'Thura', 'Nay Lin', 'Phyo Wai', 'Than Htike', 'Kyaw Soe', 'Myo Min', 'Ye Yint', 'Hein Htet', 'Lin Htet', 'Arkar', 'Sithu', 'Tun Tun', 'Win Naing', 'Zin Min']
const FEMALE = ['Su Su', 'Thida', 'Khin Khin', 'Hnin Hnin', 'Moe Moe', 'Aye Aye', 'Nandar', 'Phyu Phyu', 'Mya Sandi', 'Ei Ei', 'Yadanar', 'Shwe Sin', 'Thet Thet', 'Wai Wai', 'Cho Cho', 'May Thu', 'Nilar', 'Hla Hla', 'Ei Mon', 'Sandar']
const FAMILY = ['Oo', 'Htun', 'Naing', 'Win', 'Lwin', 'Kyaw', 'Thant', 'Zaw', 'Aye', 'Myint']
const ORIGIN_MIX: [string, number][] = [['Yangon', 0.44], ['Rakhine', 0.2], ['Mandalay', 0.16], ['Taunggyi', 0.1], ['Pyay', 0.1]]
const AIRLINES = ['Myanmar Airways Intl', 'Thai Airways', 'Bangkok Airways', 'Air India', 'Malaysia Airlines', 'Myanmar National Airlines']
// Busy months for this company: April, May and September to December.
const MONTH_WEIGHT = [0.7, 0.6, 0.8, 1.6, 1.6, 0.7, 0.6, 0.7, 1.5, 1.7, 1.8, 1.7]

const PACKAGES: Pkg[] = [
  { id: 'IN5', name: 'India 5-Day · Bodh Gaya', country: 'India', days: 5, price: 1_800_000, cost: 1_560_000, stops: ['Bodh Gaya', 'Rajgir', 'Nalanda'] },
  { id: 'IN8', name: 'India 8-Day · Buddhist Circuit', country: 'India', days: 8, price: 2_800_000, cost: 2_430_000, stops: ['Bodh Gaya', 'Rajgir', 'Nalanda', 'Vaishali', 'Kushinagar', 'Lumbini', 'Kapilavastu', 'Sravasti', 'Sarnath', 'Varanasi'] },
  { id: 'IN12', name: 'India 12-Day · Kathmandu to Varanasi', country: 'India', days: 12, price: 3_800_000, cost: 3_280_000, stops: ['Kathmandu', 'Lumbini', 'Sravasti', 'Kushinagar', 'Vaishali', 'Rajgir', 'Bodh Gaya', 'Sarnath', 'Varanasi'] },
  { id: 'IN15', name: 'India 15-Day · Dharamshala & Circuit', country: 'India', days: 15, price: 4_800_000, cost: 4_150_000, stops: ['Delhi', 'Dharamshala', 'Agra', 'Lucknow', 'Sravasti', 'Lumbini', 'Kushinagar', 'Vaishali', 'Nalanda', 'Rajgir', 'Bodh Gaya', 'Varanasi', 'Sarnath'] },
  { id: 'TH5', name: 'Thailand 5-Day · Bangkok & Pattaya', country: 'Thailand', days: 5, price: 1_500_000, cost: 1_290_000, stops: ['Bangkok', 'Pattaya'] },
  { id: 'NP6', name: 'Nepal 6-Day · Lumbini & Kathmandu', country: 'Nepal', days: 6, price: 2_200_000, cost: 1_900_000, stops: ['Lumbini', 'Kapilavastu', 'Kathmandu'] },
]
// Packages are picked in these proportions: 8 and 12 days most, then 5, then 15, with a few Thailand and Nepal trips.
const PACKAGE_MIX: [string, number][] = [['IN8', 0.3], ['IN12', 0.28], ['IN5', 0.18], ['IN15', 0.1], ['TH5', 0.08], ['NP6', 0.06]]

export function buildShowcase(today: string): Data {
  const rand = rng(Number(today.replaceAll('-', '')) % 100000 + 7)
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))
  const chance = (p: number) => rand() < p
  const pick = <T,>(xs: readonly T[]) => xs[int(0, xs.length - 1)]!
  const weighted = <T,>(xs: readonly [T, number][]) => { let r = rand(); for (const [v, w] of xs) { if ((r -= w) <= 0) return v } return xs[xs.length - 1]![0] }
  let n = 0
  // Id in UUID shape, so the demo data also passes the same checks as real records.
  const uid = () => {
    n++
    const h = (k: number) => Math.floor(rand() * 16 ** k).toString(16).padStart(k, '0')
    return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(8)}${String(n).padStart(4, '0')}`
  }
  const pkg = new Map(PACKAGES.map((p) => [p.id, p]))
  const round = (v: number, step = 5000) => Math.round(v / step) * step

  // ── Customers ────────────────────────────────────────────────────
  const used = new Set<string>()
  const customers: Customer[] = Array.from({ length: 66 }, (_, i) => {
    let name = ''
    do {
      const female = chance(0.5)
      name = `${female ? pick(['Ma', 'Daw']) : pick(['Ko', 'U'])} ${pick(female ? FEMALE : MALE)} ${pick(FAMILY)}`
    } while (used.has(name))
    used.add(name)
    return {
      id: uid(), name, township: weighted(ORIGIN_MIX), passportExpiry: '',
      phone: `09 ${int(250, 799)} ${int(100, 999)} ${int(100, 999)}`,
    }
  })

  // ── Bookings ─────────────────────────────────────────────────────
  const bookings: Booking[] = []
  const addBooking = (createdAt: string, departDate: string, status: BookingStatus, packageId?: string) => {
    const p = pkg.get(packageId ?? weighted(PACKAGE_MIX))!
    const dests = p.stops
    bookings.push({
      id: uid(), customerId: pick(customers).id, packageId: p.id, destination: dests[int(0, Math.min(dests.length - 1, 2))]!,
      departDate, pax: weighted([[1, 0.2], [2, 0.34], [3, 0.2], [4, 0.14], [5, 0.07], [6, 0.05]]), status, createdAt,
    })
  }
  // A year of history, heavier in the busy months.
  for (let made = 0; made < 150;) {
    const created = plus(today, -int(1, 365))
    if (rand() > MONTH_WEIGHT[Number(created.slice(5, 7)) - 1]! / 1.8) continue
    made++
    const p = pkg.get(weighted(PACKAGE_MIX))!
    const depart = plus(created, int(21, 60))
    const status: BookingStatus = plus(depart, p.days) < today ? (chance(0.9) ? 'completed' : 'cancelled') : depart <= today ? 'confirmed' : chance(0.55) ? 'confirmed' : chance(0.9) ? 'enquiry' : 'cancelled'
    addBooking(created, depart, status, p.id)
  }
  // Trips leaving soon, so the Trips agenda and Overview have something to show.
  ;[1, 3, 5, 8, 11, 13, 17, 21, 26, 31, 37, 43].forEach((off) => addBooking(plus(today, -int(8, 40)), plus(today, off), 'confirmed'))
  // Fresh enquiries from the last two weeks.
  for (let i = 0; i < 9; i++) addBooking(plus(today, -int(0, 13)), plus(today, int(30, 90)), 'enquiry')

  // ── Passports: some fine, some about to expire, a few expired ───
  const needsTrip = new Set(bookings.filter((b) => b.status === 'confirmed' && b.departDate >= today && b.departDate <= plus(today, 45)).map((b) => b.customerId))
  customers.forEach((c, i) => {
    if (needsTrip.has(c.id)) {
      const dep = bookings.find((b) => b.customerId === c.id && b.status === 'confirmed' && b.departDate >= today)!.departDate
      c.passportExpiry = chance(0.78) ? plus(dep, int(240, 1500)) : plus(dep, int(30, 150))
    } else if (i % 11 === 0) c.passportExpiry = plus(today, -int(10, 200))
    else if (i % 7 === 0) c.passportExpiry = plus(today, int(10, 170))
    else if (i % 23 === 0) c.passportExpiry = ''
    else c.passportExpiry = plus(today, int(200, 2200))
  })

  // ── Visa cases ──────────────────────────────────────────────────
  const visas: Case[] = []
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'enquiry' || !chance(0.85)) continue
    const p = pkg.get(b.packageId)!
    const applied = plus(b.createdAt, int(1, 5))
    const appliedAt = applied > today ? today : applied
    const fee = p.country === 'Thailand' ? int(8, 12) * 10_000 : int(15, 20) * 10_000
    const base = { id: uid(), customerId: b.customerId, kind: p.country, appliedAt, fee, cost: round(fee * 0.55, 1000) }
    const soon = b.departDate >= today
    if (!soon) {
      const decidedAt = minDay(plus(appliedAt, int(3, 9)), today)
      visas.push({ ...base, stage: chance(0.04) ? 'Rejected' : chance(0.6) ? 'Delivered' : 'Approved', decidedAt, deadline: plus(b.departDate, -10) })
    } else if (chance(0.6)) {
      visas.push({ ...base, stage: 'Approved', decidedAt: today, deadline: plus(b.departDate, -10) })
    } else {
      visas.push({ ...base, stage: pick(['Enquiry', 'Documents', 'Submitted']), deadline: plus(b.departDate, -int(6, 14)) })
    }
  }

  // ── Passport cases ──────────────────────────────────────────────
  const passports: Case[] = Array.from({ length: 34 }, (_, i) => {
    const open = i < 9
    const appliedAt = open ? plus(today, -int(1, 22)) : plus(today, -int(25, 360))
    const fee = int(18, 30) * 10_000
    const base = { id: uid(), customerId: pick(customers).id, kind: weighted([['Renewal', 0.45], ['New', 0.35], ['Lost', 0.1], ['Damaged', 0.1]] as [string, number][]), appliedAt, fee, cost: round(fee * 0.6, 1000) }
    // The first three open cases are already past their deadline.
    return open
      ? { ...base, stage: pick(['Enquiry', 'Documents', 'Submitted']), deadline: i < 3 ? plus(today, -int(2, 9)) : plus(today, int(3, 20)) }
      : { ...base, stage: chance(0.7) ? 'Collected' : 'Ready', decidedAt: minDay(plus(appliedAt, int(12, 28)), today) }
  })

  // ── Air tickets: out and back for most trips ────────────────────
  const tickets: Ticket[] = []
  const byId = new Map(customers.map((c) => [c.id, c]))
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'enquiry' || !chance(0.75)) continue
    const p = pkg.get(b.packageId)!
    const home = byId.get(b.customerId)!.township
    const gate = p.stops[0]!
    const airline = pick(AIRLINES)
    const fare = round(p.country === 'Thailand' ? int(520, 760) * 1000 : int(780, 1350) * 1000)
    const commission = round(fare * (int(40, 70) / 1000), 1000)
    tickets.push({ id: uid(), customerId: b.customerId, direction: 'Outbound', from: home, to: gate, airline, date: plus(b.departDate, -int(0, 1)), fare, commission })
    const back = plus(b.departDate, p.days)
    if (back <= plus(today, 60)) tickets.push({ id: uid(), customerId: b.customerId, direction: 'Inbound', from: gate, to: home, airline, date: back, fare, commission })
  }

  return { customers, packages: PACKAGES.map((p) => ({ ...p })), bookings, visas, passports, tickets }
}
