import { describe, expect, it } from 'vitest'
import { companyDay } from './dates'
import { rangeFor } from './analytics'

describe('companyDay (Myanmar, UTC+6:30)', () => {
  it('moves to the next day from 17:30 UTC', () => {
    expect(companyDay(new Date('2026-10-13T17:29:00Z'))).toBe('2026-10-13')
    expect(companyDay(new Date('2026-10-13T17:30:00Z'))).toBe('2026-10-14')
    expect(companyDay(new Date('2026-10-13T20:00:00Z'))).toBe('2026-10-14')
  })
  it('crosses the end of a year', () => {
    expect(companyDay(new Date('2026-12-31T18:00:00Z'))).toBe('2027-01-01')
  })
})

describe('rangeFor uses the company day', () => {
  it('ends on the Myanmar date, not the UTC date', () => {
    const r = rangeFor('30d', new Date('2026-10-13T20:00:00Z'))
    expect(r.to).toBe('2026-10-14')
    expect(r.from).toBe('2026-09-14')
  })
})
