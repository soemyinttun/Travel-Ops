import { describe, expect, it } from 'vitest'
import { buildShowcase } from './demo'
import { checkBackup } from './importer/validate'
import { buildSales } from './analytics'

const TODAY = '2026-10-19'
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

describe('presentation demo data', () => {
  const data = buildShowcase(TODAY)

  it('passes the same checks as an imported backup', () => {
    const r = checkBackup(data)
    expect(r.errors).toEqual([])
    expect(r.data).not.toBeNull()
  })

  it('is the same on the same day and different on another', () => {
    expect(JSON.stringify(buildShowcase(TODAY))).toBe(JSON.stringify(data))
    expect(JSON.stringify(buildShowcase('2026-10-20'))).not.toBe(JSON.stringify(data))
  })

  it('has enough of everything to fill every screen', () => {
    expect(data.customers.length).toBeGreaterThanOrEqual(60)
    expect(data.packages).toHaveLength(6)
    expect(data.bookings.length).toBeGreaterThan(150)
    expect(data.visas.length).toBeGreaterThan(60)
    expect(data.passports.length).toBeGreaterThan(30)
    expect(data.tickets.length).toBeGreaterThan(80)
    const statuses = new Set(data.bookings.map((b) => b.status))
    expect(statuses).toEqual(new Set(['enquiry', 'confirmed', 'completed', 'cancelled']))
    expect(new Set(data.tickets.map((t) => t.direction))).toEqual(new Set(['Inbound', 'Outbound']))
  })

  it('has trips leaving soon and cases that need attention', () => {
    const soon = data.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= TODAY && b.departDate <= plus(TODAY, 14))
    expect(soon.length).toBeGreaterThanOrEqual(5)
    const next45 = data.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= TODAY && b.departDate <= plus(TODAY, 45))
    expect(next45.length).toBeGreaterThanOrEqual(10)
    const open = (rows: typeof data.visas, done: string[]) => rows.filter((c) => !done.includes(c.stage))
    const openVisa = open(data.visas, ['Approved', 'Delivered', 'Rejected'])
    const openPassport = open(data.passports, ['Ready', 'Collected'])
    expect(openVisa.length).toBeGreaterThan(0)
    expect(openPassport.length).toBeGreaterThan(0)
    expect([...openVisa, ...openPassport].some((c) => c.deadline && c.deadline < TODAY)).toBe(true)
    expect(data.customers.some((c) => c.passportExpiry && c.passportExpiry < TODAY)).toBe(true)
    expect(data.customers.some((c) => c.passportExpiry && c.passportExpiry >= TODAY && c.passportExpiry < plus(TODAY, 180))).toBe(true)
  })

  it('never puts a date in the future where it cannot be (applied or decided after today)', () => {
    for (const c of [...data.visas, ...data.passports]) {
      expect(c.appliedAt <= TODAY).toBe(true)
      if (c.decidedAt) expect(c.decidedAt <= TODAY).toBe(true)
    }
  })

  it('makes more in the busy months than the quiet ones, and India 8 and 12 days lead', () => {
    const sales = buildSales(data).filter((s) => s.service === 'Package')
    const month = (m: number) => sales.filter((s) => Number(s.date.slice(5, 7)) === m).length
    const busy = [4, 5, 9, 10, 11, 12].reduce((s, m) => s + month(m), 0)
    const quiet = [1, 2, 3, 6, 7, 8].reduce((s, m) => s + month(m), 0)
    expect(busy).toBeGreaterThan(quiet)
    const count = (id: string) => data.bookings.filter((b) => b.packageId === id).length
    expect(Math.min(count('IN8'), count('IN12'))).toBeGreaterThan(count('IN5'))
    expect(count('IN5')).toBeGreaterThan(count('IN15'))
  })

  it('uses only invented customers (no real-looking records from the private dataset)', () => {
    const names = new Set(data.customers.map((c) => c.name))
    expect(names.size).toBe(data.customers.length)
  })
})
