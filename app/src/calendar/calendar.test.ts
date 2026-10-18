import { describe, expect, it } from 'vitest'
import { buildEvents, buildICS, fold, handleFeed, INCLUDE_ALL, type CalendarInput, type FeedDb } from '../ics'
import { feedUrls } from './feed'

const data: CalendarInput = {
  customers: [{ id: 'c1', name: 'Ko Aung' }, { id: 'c2', name: 'Daw Su, Mya' }],
  packages: [{ id: 'IN8', name: 'India 8-Day', days: 8 }],
  bookings: [
    { id: 'b1', customerId: 'c1', packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2026-11-10', pax: 2, status: 'confirmed' },
    { id: 'b2', customerId: 'c2', packageId: 'IN8', destination: 'Rajgir', departDate: '2026-11-12', pax: 1, status: 'enquiry' },
    { id: 'b3', customerId: 'c1', packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2024-01-05', pax: 1, status: 'confirmed' },
    { id: 'b4', customerId: 'c1', packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2028-01-05', pax: 1, status: 'confirmed' },
  ],
  visas: [
    { id: 'v1', customerId: 'c1', kind: 'India', stage: 'Documents', deadline: '2026-11-01' },
    { id: 'v2', customerId: 'c1', kind: 'India', stage: 'Approved', deadline: '2026-11-02' },
    { id: 'v3', customerId: 'c1', kind: 'India', stage: 'Documents' },
  ],
  passports: [{ id: 'p1', customerId: 'c2', kind: 'Renewal', stage: 'Submitted', deadline: '2026-11-20' }],
  tickets: [{ id: 't1', customerId: 'c1', direction: 'Outbound', from: 'Yangon', to: 'Bodh Gaya', airline: 'Thai Airways', date: '2026-11-10' }],
}
const NOW = new Date('2026-10-19T08:00:00Z')

describe('buildEvents', () => {
  it('turns confirmed trips, open deadlines and flights into events, nothing else', () => {
    const e = buildEvents(data)
    expect(e.map((x) => x.uid).sort()).toEqual(['fl-t1', 'pp-p1', 'trip-b1', 'trip-b3', 'trip-b4', 'visa-v1'])
  })

  it('a trip lasts from departure to the last day of the package (8 days from 10 Nov ends 17 Nov)', () => {
    const trip = buildEvents(data).find((x) => x.uid === 'trip-b1')!
    expect(trip).toMatchObject({ start: '2026-11-10', end: '2026-11-17', title: 'Ko Aung · India 8-Day', kind: 'trip' })
  })

  it('include flags switch each kind off', () => {
    expect(buildEvents(data, { trips: true, deadlines: false, flights: false }).map((x) => x.kind)).toEqual(['trip', 'trip', 'trip'])
    expect(buildEvents(data, { trips: false, deadlines: true, flights: false }).map((x) => x.kind).sort()).toEqual(['passport', 'visa'])
    expect(buildEvents(data, { trips: false, deadlines: false, flights: true }).map((x) => x.kind)).toEqual(['flight'])
  })

  it('a window keeps events that touch it, including a trip already under way', () => {
    const e = buildEvents(data, INCLUDE_ALL, { from: '2026-11-15', to: '2026-12-31' })
    expect(e.map((x) => x.uid).sort()).toEqual(['pp-p1', 'trip-b1']) // trip-b1 ends 17 Nov; others are earlier or later
  })
})

describe('buildICS', () => {
  const ics = buildICS(buildEvents(data, INCLUDE_ALL, { from: '2026-11-01', to: '2026-12-31' }), { name: 'SSM Travel Ops', refreshHours: 1, now: NOW })
  const unfolded = ics.replace(/\r\n /g, '')

  it('is a valid calendar with CRLF lines, a name and a refresh hint', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(unfolded).toContain('X-WR-CALNAME:SSM Travel Ops')
    expect(unfolded).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H')
    expect(unfolded).toContain('DTSTAMP:20261019T080000Z')
  })

  it('all-day events end the day after the last day (RFC 5545), with stable ids', () => {
    expect(unfolded).toContain('UID:trip-b1@travelops.local')
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261110')
    expect(unfolded).toContain('DTEND;VALUE=DATE:20261118')
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261121') // one-day deadline
  })

  it('escapes commas and semicolons in names', () => {
    expect(unfolded).toContain('SUMMARY:Passport due: Daw Su\\, Mya (Renewal)')
  })

  it('carries names, places and dates only', () => {
    expect(unfolded).not.toMatch(/phone|passport number|fee|fare|commission|\d{9}/i)
  })
})

describe('fold', () => {
  it('splits long lines at 75 bytes and the pieces join back to the original', () => {
    const line = 'SUMMARY:' + 'a'.repeat(100)
    const parts = fold(line)
    expect(parts[0]!.length).toBe(75)
    expect(parts.length).toBe(2)
    expect(parts.join('\r\n').replace(/\r\n /g, '')).toBe(line)
  })

  it('never cuts a Burmese letter in half', () => {
    const line = 'SUMMARY:' + 'မြန်မာ'.repeat(12)
    const parts = fold(line)
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(parts.join('\r\n').replace(/\r\n /g, '')).toBe(line)
  })
})

describe('handleFeed (the live calendar link)', () => {
  const TOKEN = '3f2a8c1e-5b7d-4e90-9a11-0c2d4e6f8a10'
  const db = (over: Partial<FeedDb> = {}, include = { include_trips: true, include_deadlines: true, include_flights: true }): FeedDb => ({
    feedByToken: async (t) => (t === TOKEN ? { user_id: 'u1', ...include } : null),
    roleOf: async () => 'staff',
    load: async () => data,
    ...over,
  })

  it('answers a good link with a calendar', async () => {
    const r = await handleFeed(TOKEN, db(), NOW)
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toBe('text/calendar; charset=utf-8')
    expect(r.body).toContain('trip-b1')
    expect(r.body).not.toContain('trip-b3') // 2024: older than 30 days
    expect(r.body).not.toContain('trip-b4') // 2028: more than a year ahead
  })

  it('gives the same plain "Not found" for a missing, malformed, unknown or switched-off link', async () => {
    const bad = [null, '', 'abc', '3f2a8c1e-5b7d-4e90-9a11-0c2d4e6f8a11']
    const answers = await Promise.all(bad.map((t) => handleFeed(t, db(), NOW)))
    for (const a of answers) expect(a).toEqual({ status: 404, body: 'Not found', headers: { 'content-type': 'text/plain; charset=utf-8' } })
  })

  it('stops working when the person is pending, has no profile, or is removed', async () => {
    for (const role of ['pending', null, 'nobody']) {
      expect((await handleFeed(TOKEN, db({ roleOf: async () => role }), NOW)).status).toBe(404)
    }
    expect((await handleFeed(TOKEN, db({ roleOf: async () => 'admin' }), NOW)).status).toBe(200)
  })

  it('only includes what the link was set up to include', async () => {
    const r = await handleFeed(TOKEN, db({}, { include_trips: false, include_deadlines: true, include_flights: false }), NOW)
    expect(r.body).toContain('visa-v1')
    expect(r.body).toContain('pp-p1')
    expect(r.body).not.toContain('trip-b1')
    expect(r.body).not.toContain('fl-t1')
  })

  it('accepts the code in capital letters', async () => {
    expect((await handleFeed(TOKEN.toUpperCase(), db(), NOW)).status).toBe(200)
  })
})

describe('feedUrls', () => {
  it('builds the copy link, the Apple link and the Google link', () => {
    const u = feedUrls('abc.supabase.co', TOKEN_FOR_URLS)
    expect(u.https).toBe(`https://abc.supabase.co/functions/v1/calendar?token=${TOKEN_FOR_URLS}`)
    expect(u.webcal).toBe(`webcal://abc.supabase.co/functions/v1/calendar?token=${TOKEN_FOR_URLS}`)
    expect(u.google).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(u.webcal)}`)
  })
})
const TOKEN_FOR_URLS = '3f2a8c1e-5b7d-4e90-9a11-0c2d4e6f8a10'
