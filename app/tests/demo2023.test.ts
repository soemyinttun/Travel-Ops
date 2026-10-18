/**
 * demo-data/2023.json is the file handed to people for presentations. This proves it will import
 * cleanly and sync to the real database design: it passes the importer's checks, every row is
 * accepted by the actual Postgres tables and access rules (PGlite, all migrations applied, as an
 * approved staff member), what comes back out is exactly what went in, and it contains something
 * to show for every screen of the app.
 */
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkBackup } from '../src/importer/validate'
import { COLUMNS, fromDb, toDb } from '../src/sync/columns'
import { buildSales } from '../src/analytics'
import { TABLES, type Data, type TableName } from '../src/types'

const files = import.meta.glob('../../demo-data/2023.json', { eager: true, import: 'default' }) as Record<string, unknown>
const FILE = Object.values(files)[0] as Data
const migrations = import.meta.glob('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const SQL = Object.keys(migrations).sort().map((k) => migrations[k]!)

/** The day the live part of the file was made for (see demo-data/make-2023.mjs). */
const LIVE = '2026-10-19'
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const STAFF = '00000000-0000-0000-0000-00000000000b'

describe('2023.json passes the importer', () => {
  const r = checkBackup(FILE)
  it('has no errors and no warnings', () => {
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.data).not.toBeNull()
  })
  it('holds the expected amount of data', () => {
    expect(r.counts.customers).toBeGreaterThanOrEqual(100)
    expect(r.counts.packages).toBe(6)
    expect(r.counts.bookings).toBeGreaterThan(200)
    expect(r.counts.visas).toBeGreaterThan(100)
    expect(r.counts.passports).toBeGreaterThan(40)
    expect(r.counts.tickets).toBeGreaterThan(200)
  })
})

describe('2023.json syncs to the real database design', () => {
  let db: PGlite
  beforeAll(async () => {
    db = await PGlite.create()
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb not null default '{}', raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      create publication supabase_realtime;
    `)
    for (const sql of SQL) await db.exec(sql)
    await db.exec(`insert into auth.users (id, email) values ('${STAFF}', 'staff@x'); update public.profiles set role = 'staff' where id = '${STAFF}';`)
    // Push everything the way the sync does, as an approved staff member, parents before children.
    await db.exec(`set request.jwt.claim.sub = '${STAFF}'; set role authenticated;`)
    for (const t of TABLES) {
      for (const row of FILE[t] as unknown as Record<string, unknown>[]) {
        const db_ = toDb(t, row)
        const keys = Object.keys(db_)
        await db.query(`insert into public.${t} (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map((k) => db_[k]))
      }
    }
  }, 180_000)
  afterAll(async () => { await db.exec('reset role'); await db.close() })

  it('every row is accepted by the tables, their checks, foreign keys and access rules', async () => {
    for (const t of TABLES) {
      const n = (await db.query<{ n: number }>(`select count(*)::int as n from public.${t}`)).rows[0]!.n
      expect(n, t).toBe((FILE[t] as unknown[]).length)
    }
  })

  it('reading it back gives exactly what was put in (so every device ends up with the same data)', async () => {
    const norm = (v: unknown): unknown => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'bigint' ? Number(v) : v)
    for (const t of TABLES as readonly TableName[]) {
      const back = new Map((await db.query<Record<string, unknown>>(`select * from public.${t}`)).rows.map((r) => [r['id'] as string, fromDb(t, Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)])))]))
      for (const row of FILE[t] as unknown as Record<string, unknown>[]) {
        const got = back.get(row['id'] as string)!
        expect(got, `${t} ${String(row['id'])}`).toBeTruthy()
        for (const c of COLUMNS[t]) {
          const want = row[c.app]
          const have = got[c.app]
          expect(Array.isArray(want) ? want : norm(have) ?? (c.empty === '' ? '' : undefined), `${t}.${c.app}`).toEqual(Array.isArray(want) ? have : want === undefined ? undefined : want)
        }
      }
    }
  })
})

describe('2023.json has something to show on every screen', () => {
  const d = FILE
  const sales = buildSales(d)
  const month = (m: number) => sales.filter((s) => s.service === 'Package' && s.date.startsWith('2023') && Number(s.date.slice(5, 7)) === m).length

  it('has a full year of 2023 sales, busier in April, May and September to December', () => {
    for (let m = 1; m <= 12; m++) expect(month(m), `month ${m}`).toBeGreaterThan(0)
    const busy = [4, 5, 9, 10, 11, 12].reduce((s, m) => s + month(m), 0)
    const quiet = [1, 2, 3, 6, 7, 8].reduce((s, m) => s + month(m), 0)
    expect(busy).toBeGreaterThan(quiet)
    expect(new Set(sales.filter((s) => s.date.startsWith('2023')).map((s) => s.service))).toEqual(new Set(['Package', 'Visa', 'Passport', 'Air ticket']))
  })

  it('shows every booking status, ticket direction, origin town and country', () => {
    expect(new Set(d.bookings.map((b) => b.status))).toEqual(new Set(['enquiry', 'confirmed', 'completed', 'cancelled']))
    expect(new Set(d.tickets.map((t) => t.direction))).toEqual(new Set(['Inbound', 'Outbound']))
    expect(new Set(d.customers.map((c) => c.township))).toEqual(new Set(['Yangon', 'Rakhine', 'Mandalay', 'Taunggyi', 'Pyay']))
    expect(new Set(d.packages.map((p) => p.country))).toEqual(new Set(['India', 'Nepal', 'Thailand']))
  })

  it('India 8 and 12 days sell most, then 5, then 15', () => {
    const n = (id: string) => d.bookings.filter((b) => b.packageId === id).length
    expect(Math.min(n('IN8'), n('IN12'))).toBeGreaterThan(n('IN5'))
    expect(n('IN5')).toBeGreaterThan(n('IN15'))
  })

  it('has trips leaving soon, with some missing a document, for Trips and Overview', () => {
    const soon = d.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= LIVE && b.departDate <= plus(LIVE, 14))
    const next45 = d.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= LIVE && b.departDate <= plus(LIVE, 45))
    expect(soon.length).toBeGreaterThanOrEqual(5)
    expect(next45.length).toBeGreaterThanOrEqual(10)
    const missing = next45.filter((b) => {
      const c = d.customers.find((x) => x.id === b.customerId)!
      const p = d.packages.find((x) => x.id === b.packageId)!
      const passport = c.passportExpiry && Date.parse(c.passportExpiry) - Date.parse(b.departDate) >= 180 * 86_400_000
      const visa = d.visas.some((v) => v.customerId === b.customerId && v.kind === p.country && ['Approved', 'Delivered'].includes(v.stage))
      return !passport || !visa
    })
    expect(missing.length).toBeGreaterThan(0)
  })

  it('has open visa and passport cases, some past deadline, for the case boards and alerts', () => {
    const open = (rows: Data['visas'], done: string[]) => rows.filter((c) => !done.includes(c.stage))
    const ov = open(d.visas, ['Approved', 'Delivered', 'Rejected']), op = open(d.passports, ['Ready', 'Collected'])
    expect(ov.length).toBeGreaterThan(0)
    expect(op.length).toBeGreaterThan(0)
    expect([...ov, ...op].some((c) => c.deadline && c.deadline < LIVE)).toBe(true)
    // every stage is used, so every column and filter has a case in it
    expect(new Set(d.visas.map((c) => c.stage)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(d.passports.map((c) => c.stage)).size).toBeGreaterThanOrEqual(4)
  })

  it('has expired and soon-to-expire passports, and customers with none saved', () => {
    expect(d.customers.some((c) => c.passportExpiry && c.passportExpiry < LIVE)).toBe(true)
    expect(d.customers.some((c) => c.passportExpiry && c.passportExpiry >= LIVE && c.passportExpiry < plus(LIVE, 180))).toBe(true)
    expect(d.customers.some((c) => c.passportExpiry === '')).toBe(true)
  })

  it('has fresh enquiries and a variety of package sizes for the pipeline and heatmaps', () => {
    expect(d.bookings.filter((b) => b.status === 'enquiry' && b.createdAt >= plus(LIVE, -14)).length).toBeGreaterThan(0)
    expect(new Set(d.bookings.map((b) => b.pax)).size).toBeGreaterThanOrEqual(5)
  })
})
