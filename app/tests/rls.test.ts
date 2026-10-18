/**
 * Runs every file in supabase/migrations on a real Postgres (PGlite, in memory) and checks the
 * access rules as different people. Supabase's own pieces (roles, auth.users, auth.uid()) are
 * stubbed below.
 */
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migrations = import.meta.glob('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const MIGRATION_SQL = Object.keys(migrations).sort().map((k) => migrations[k]!)

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const STAFF = '00000000-0000-0000-0000-00000000000b'
const PENDING = '00000000-0000-0000-0000-00000000000c'
const GOOGLE = '00000000-0000-0000-0000-00000000000d'
const C1 = '11111111-1111-1111-1111-111111111111'

let db: PGlite

/** Runs `fn` as a signed-in user (or anonymous when uid is null). */
async function as<T>(uid: string | null, role: 'anon' | 'authenticated', fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role; set request.jwt.claim.sub = '${uid ?? ''}'; set role ${role};`)
  try { return await fn() } finally { await db.exec('reset role') }
}
const attempt = async (sql: string) => { try { return { ok: true as const, result: await db.query(sql) } } catch (e) { return { ok: false as const, error: (e as Error).message } } }
const count = async (sql: string) => (await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`)).rows[0]!.n

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
  for (const sql of MIGRATION_SQL) await db.exec(sql)
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@x'), ('${STAFF}', 'staff@x'), ('${PENDING}', 'pending@x');
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
      values ('${GOOGLE}', 'g@x', '{"provider":"google"}', '{"full_name":"Ma Google","avatar_url":"https://img/x.png"}');
    update public.profiles set role = 'admin' where id = '${ADMIN}';
    update public.profiles set role = 'staff' where id = '${STAFF}';
    insert into public.customers (id, name) values ('${C1}', 'Seed customer');
  `)
}, 120_000)
afterAll(() => db.close())

describe('migrations', () => {
  it('apply in order on an empty database', () => {
    expect(MIGRATION_SQL.length).toBeGreaterThanOrEqual(2)
  })
})

describe('new accounts', () => {
  it('start as pending', async () => {
    expect((await db.query<{ role: string }>(`select role from public.profiles where id = '${PENDING}'`)).rows[0]!.role).toBe('pending')
  })
  it('a Google sign-up is recorded with name, method and picture, and is pending', async () => {
    const p = (await db.query<Record<string, string>>(`select role, provider, display_name, avatar_url from public.profiles where id = '${GOOGLE}'`)).rows[0]!
    expect(p).toEqual({ role: 'pending', provider: 'google', display_name: 'Ma Google', avatar_url: 'https://img/x.png' })
  })
  it('an email sign-up is recorded as method "email"', async () => {
    expect((await db.query<{ provider: string }>(`select provider from public.profiles where id = '${PENDING}'`)).rows[0]!.provider).toBe('email')
  })
})

describe('not signed in, and pending people', () => {
  it('anonymous cannot read business data', async () => {
    const r = await as(null, 'anon', () => attempt('select * from public.customers'))
    expect(r.ok).toBe(false)
  })
  it('pending users (email or Google) see no business data and cannot add any', async () => {
    for (const uid of [PENDING, GOOGLE]) {
      await as(uid, 'authenticated', async () => {
        expect(await count('select 1 from public.customers')).toBe(0)
        expect((await attempt(`insert into public.customers (id, name) values (gen_random_uuid(), 'x')`)).ok).toBe(false)
        expect(await count('select 1 from public.profiles')).toBe(1) // only their own
      })
    }
  })
  it('pending users cannot approve themselves', async () => {
    await as(GOOGLE, 'authenticated', async () => {
      const r = await attempt(`update public.profiles set role = 'admin' where id = '${GOOGLE}'`)
      expect(!r.ok || r.result.affectedRows === 0).toBe(true)
    })
    expect((await db.query<{ role: string }>(`select role from public.profiles where id = '${GOOGLE}'`)).rows[0]!.role).toBe('pending')
  })
})

describe('staff', () => {
  it('read and change business data; updated_at and updated_by are set by the database', async () => {
    await as(STAFF, 'authenticated', async () => {
      expect(await count('select 1 from public.customers')).toBe(1)
      const up = await attempt(`update public.customers set name = 'Renamed', updated_at = '2000-01-01' where id = '${C1}'`)
      expect(up.ok).toBe(true)
      const row = (await db.query<{ name: string; updated_at: Date; updated_by: string }>(`select name, updated_at, updated_by from public.customers where id = '${C1}'`)).rows[0]!
      expect(row.name).toBe('Renamed')
      expect(new Date(row.updated_at).getFullYear()).toBeGreaterThan(2000)
      expect(row.updated_by).toBe(STAFF)
      expect((await attempt(`insert into public.customers (id, name) values (gen_random_uuid(), 'New') on conflict (id) do update set name = excluded.name`)).ok).toBe(true)
    })
  })
  it('cannot hard-delete, change roles, or write import history', async () => {
    await as(STAFF, 'authenticated', async () => {
      expect((await attempt(`delete from public.customers where id = '${C1}'`)).ok).toBe(false)
      const role = await attempt(`update public.profiles set role = 'admin' where id = '${STAFF}'`)
      expect(!role.ok || role.result.affectedRows === 0).toBe(true)
      expect((await attempt(`insert into public.import_log (file_name, mode, counts) values ('f', 'add', '{}')`)).ok).toBe(false)
    })
    expect(await count(`select 1 from public.customers where id = '${C1}'`)).toBe(1)
  })
  it('cannot save invalid data (bad stage, negative money)', async () => {
    await as(STAFF, 'authenticated', async () => {
      expect((await attempt(`insert into public.visas (id, customer_id, kind, stage, applied_on, fee, cost) values (gen_random_uuid(), '${C1}', 'India', 'Lost', current_date, 1, 1)`)).ok).toBe(false)
      expect((await attempt(`insert into public.packages (id, name, country, days, price, cost) values ('X1', 'x', 'India', 5, -1, 0)`)).ok).toBe(false)
    })
  })
})

describe('admins', () => {
  it('see everyone (with how they sign in) and can approve people', async () => {
    await as(ADMIN, 'authenticated', async () => {
      const people = (await db.query<{ email: string; provider: string }>('select email, provider from public.profiles order by email')).rows
      expect(people.map((p) => p.email)).toEqual(['admin@x', 'g@x', 'pending@x', 'staff@x'])
      expect(people.find((p) => p.email === 'g@x')!.provider).toBe('google')
      const r = await attempt(`update public.profiles set role = 'staff' where id = '${GOOGLE}'`)
      expect(r.ok && r.result.affectedRows === 1).toBe(true)
    })
    // …and once approved, that person can read business data.
    await as(GOOGLE, 'authenticated', async () => { expect(await count(`select 1 from public.customers where id = '${C1}'`)).toBe(1) })
    await db.exec(`update public.profiles set role = 'pending' where id = '${GOOGLE}'`)
  })
  it('can write and read import history', async () => {
    await as(ADMIN, 'authenticated', async () => {
      expect((await attempt(`insert into public.import_log (file_name, mode, counts) values ('backup.json', 'replace', '{"customers":1}')`)).ok).toBe(true)
      expect(await count('select 1 from public.import_log')).toBe(1)
    })
  })
  it('cannot demote the last admin', async () => {
    await as(ADMIN, 'authenticated', async () => {
      const r = await attempt(`update public.profiles set role = 'staff' where id = '${ADMIN}'`)
      expect(r.ok).toBe(false)
    })
  })
})

describe('realtime', () => {
  it('covers the six data tables', async () => {
    const rows = (await db.query<{ tablename: string }>(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows
    expect(rows.map((r) => r.tablename)).toEqual(['bookings', 'customers', 'packages', 'passports', 'tickets', 'visas'])
  })
})

describe('calendar links', () => {
  it('approved people can make, change and delete their own link', async () => {
    await as(STAFF, 'authenticated', async () => {
      expect((await attempt(`insert into public.calendar_feeds (user_id) values ('${STAFF}')`)).ok).toBe(true)
      const row = (await db.query<{ token: string; include_trips: boolean }>('select token, include_trips from public.calendar_feeds')).rows[0]!
      expect(row.token).toMatch(/^[0-9a-f-]{36}$/)
      expect(row.include_trips).toBe(true)
      expect((await attempt(`update public.calendar_feeds set include_flights = false where user_id = '${STAFF}'`)).ok).toBe(true)
      expect((await db.query<{ include_flights: boolean }>('select include_flights from public.calendar_feeds')).rows[0]!.include_flights).toBe(false)
    })
  })

  it('nobody sees or changes another person\'s link, and cannot make one in their name', async () => {
    await as(ADMIN, 'authenticated', async () => {
      expect((await attempt(`insert into public.calendar_feeds (user_id) values ('${ADMIN}')`)).ok).toBe(true)
      // The admin sees only their own row, even though staff made one earlier.
      expect(await count('select 1 from public.calendar_feeds')).toBe(1)
      expect((await attempt(`insert into public.calendar_feeds (user_id) values ('${STAFF}')`)).ok).toBe(false)
      await db.exec(`update public.calendar_feeds set include_trips = false where user_id = '${STAFF}'`) // matches no visible row
    })
    await as(STAFF, 'authenticated', async () => {
      expect(await count('select 1 from public.calendar_feeds')).toBe(1)
      expect((await db.query<{ include_trips: boolean }>('select include_trips from public.calendar_feeds')).rows[0]!.include_trips).toBe(true)
      await db.exec(`delete from public.calendar_feeds where user_id = '${ADMIN}'`) // matches no visible row
    })
    await as(ADMIN, 'authenticated', async () => { expect(await count('select 1 from public.calendar_feeds')).toBe(1) })
  })

  it('pending people and anonymous visitors cannot read or make a link', async () => {
    await as(PENDING, 'authenticated', async () => {
      expect(await count('select 1 from public.calendar_feeds')).toBe(0)
      expect((await attempt(`insert into public.calendar_feeds (user_id) values ('${PENDING}')`)).ok).toBe(false)
    })
    await as(null, 'anon', async () => { expect((await attempt('select * from public.calendar_feeds')).ok).toBe(false) })
  })

  it('a person can switch their link off, and a new link needs a new secret', async () => {
    await as(STAFF, 'authenticated', async () => {
      const before = (await db.query<{ token: string }>('select token from public.calendar_feeds')).rows[0]!.token
      await db.exec(`update public.calendar_feeds set token = gen_random_uuid() where user_id = '${STAFF}'`)
      expect((await db.query<{ token: string }>('select token from public.calendar_feeds')).rows[0]!.token).not.toBe(before)
      await db.exec(`delete from public.calendar_feeds where user_id = '${STAFF}'`)
      expect(await count('select 1 from public.calendar_feeds')).toBe(0)
    })
  })
})
