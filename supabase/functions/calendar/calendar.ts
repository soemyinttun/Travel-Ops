/**
 * Calendar events and the .ics file, shared by the app (Trips screen, file download) and the
 * "calendar" Edge Function (the live subscription link). Plain TypeScript with no imports, so
 * it runs in the browser, in Deno and in the tests. Only names, places and dates go into a
 * calendar: never phone numbers, passport numbers or money.
 */

export interface CalEvent {
  uid: string
  title: string
  start: string // YYYY-MM-DD
  end?: string // YYYY-MM-DD, inclusive last day (defaults to start)
  desc?: string
  kind: 'trip' | 'visa' | 'flight' | 'passport'
}

/** What a calendar may contain. */
export interface Include { trips: boolean; deadlines: boolean; flights: boolean }
export const INCLUDE_ALL: Include = { trips: true, deadlines: true, flights: true }

/** The parts of the company data a calendar needs (the app's own data types fit this shape). */
export interface CalendarInput {
  customers: { id: string; name: string }[]
  packages: { id: string; name: string; days: number }[]
  bookings: { id: string; customerId: string; packageId: string; destination: string; departDate: string; pax: number; status: string }[]
  visas: { id: string; customerId: string; kind: string; stage: string; deadline?: string }[]
  passports: { id: string; customerId: string; kind: string; stage: string; deadline?: string }[]
  tickets: { id: string; customerId: string; direction: string; from: string; to: string; airline: string; date: string }[]
}

const FINISHED = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']

const compact = (d: string) => d.replace(/-/g, '')
export function plusDay(d: string, n = 1): string {
  const t = new Date(d + 'T00:00:00Z')
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

/**
 * Trips, deadlines and flights as calendar events. `window` keeps only events that touch
 * [from, to] (both YYYY-MM-DD), used by the live feed so the file stays small.
 */
export function buildEvents(data: CalendarInput, include: Include = INCLUDE_ALL, window?: { from: string; to: string }): CalEvent[] {
  const name = new Map(data.customers.map((c) => [c.id, c.name]))
  const pkg = new Map(data.packages.map((p) => [p.id, p]))
  const out: CalEvent[] = []
  if (include.trips) {
    for (const b of data.bookings) {
      if (b.status !== 'confirmed') continue
      const p = pkg.get(b.packageId)
      if (!p) continue
      out.push({ uid: `trip-${b.id}`, kind: 'trip', title: `${name.get(b.customerId)} · ${p.name}`, start: b.departDate, end: plusDay(b.departDate, p.days - 1), desc: `${p.name} to ${b.destination}, ${b.pax} pax` })
    }
  }
  if (include.deadlines) {
    for (const c of data.visas) if (c.deadline && !FINISHED.includes(c.stage)) out.push({ uid: `visa-${c.id}`, kind: 'visa', title: `Visa due: ${name.get(c.customerId)} (${c.kind})`, start: c.deadline, desc: `Stage: ${c.stage}` })
    for (const c of data.passports) if (c.deadline && !FINISHED.includes(c.stage)) out.push({ uid: `pp-${c.id}`, kind: 'passport', title: `Passport due: ${name.get(c.customerId)} (${c.kind})`, start: c.deadline, desc: `Stage: ${c.stage}` })
  }
  if (include.flights) {
    for (const t of data.tickets) out.push({ uid: `fl-${t.id}`, kind: 'flight', title: `Flight ${t.from}→${t.to}: ${name.get(t.customerId)}`, start: t.date, desc: `${t.airline} · ${t.direction}` })
  }
  return window ? out.filter((e) => (e.end ?? e.start) >= window.from && e.start <= window.to) : out
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const encoder = new TextEncoder()

/** Lines in an .ics file are at most 75 bytes; longer ones continue on the next line after a space. */
export function fold(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  let limit = 75
  for (const ch of line) {
    const n = encoder.encode(ch).length
    if (bytes + n > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75 }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out
}

export interface IcsOptions {
  /** Calendar name shown in the calendar app. */
  name?: string
  /** Ask calendar apps to check for changes this often (hours). Google may ignore it. */
  refreshHours?: number
  /** For repeatable tests. */
  now?: Date
}

/** All-day events; DTEND is exclusive per RFC 5545. */
export function buildICS(events: CalEvent[], opts: IcsOptions = {}): string {
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SSM Travel & Tours Co., Ltd.//EN', 'CALSCALE:GREGORIAN']
  if (opts.name) lines.push(`X-WR-CALNAME:${esc(opts.name)}`)
  if (opts.refreshHours) lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`)
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@travelops.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(plusDay(e.end ?? e.start))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.desc ? [`DESCRIPTION:${esc(e.desc)}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.flatMap(fold).join('\r\n') + '\r\n'
}

// ── The live subscription link ─────────────────────────────────────────

export interface Feed { user_id: string; include_trips: boolean; include_deadlines: boolean; include_flights: boolean }

/** What the Edge Function needs from the database. Kept as an interface so tests can fake it. */
export interface FeedDb {
  feedByToken(token: string): Promise<Feed | null>
  roleOf(userId: string): Promise<string | null>
  load(): Promise<CalendarInput>
}
export interface FeedResponse { status: number; body: string; headers: Record<string, string> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOT_FOUND: FeedResponse = { status: 404, body: 'Not found', headers: { 'content-type': 'text/plain; charset=utf-8' } }

/**
 * Answers one request for a calendar link. A bad, unknown or switched-off link, or a person who
 * is no longer approved staff, all get the same "Not found" so nothing is revealed.
 */
export async function handleFeed(token: string | null, db: FeedDb, now: Date = new Date()): Promise<FeedResponse> {
  if (!token || !UUID.test(token)) return NOT_FOUND
  const feed = await db.feedByToken(token.toLowerCase())
  if (!feed) return NOT_FOUND
  const role = await db.roleOf(feed.user_id)
  if (role !== 'staff' && role !== 'admin') return NOT_FOUND
  const today = now.toISOString().slice(0, 10)
  const events = buildEvents(
    await db.load(),
    { trips: feed.include_trips, deadlines: feed.include_deadlines, flights: feed.include_flights },
    { from: plusDay(today, -30), to: plusDay(today, 365) },
  )
  return {
    status: 200,
    body: buildICS(events, { name: 'SSM Travel Ops', refreshHours: 1, now }),
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300' },
  }
}
