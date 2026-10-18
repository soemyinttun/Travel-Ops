// Supabase Edge Function "calendar": the live calendar link that Google Calendar and Apple Calendar subscribe to.
//
//   https://<project>.supabase.co/functions/v1/calendar?token=<secret link code>
//
// Deploy WITHOUT login checks, because calendar apps cannot sign in:
//   supabase functions deploy calendar --no-verify-jwt
// (or switch "Verify JWT" off for this function in the Supabase dashboard).
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to every Edge Function automatically.
// The service key only lives on Supabase's server; it is never sent to the app or the browser.
// All the logic is in calendar.ts, which has tests.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { handleFeed, type CalendarInput, type FeedDb } from './calendar.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

/** Every row of a table that is not soft-deleted. */
async function rows<T>(table: string, columns: string): Promise<T[]> {
  const { data, error } = await db.from(table).select(columns).eq('deleted', false).range(0, 9999)
  if (error) throw new Error(`${table}: ${error.message}`)
  return (data ?? []) as T[]
}

const store: FeedDb = {
  async feedByToken(token) {
    const { data, error } = await db.from('calendar_feeds').select('user_id, include_trips, include_deadlines, include_flights').eq('token', token).maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },
  async roleOf(userId) {
    const { data, error } = await db.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    return data?.role ?? null
  },
  async load(): Promise<CalendarInput> {
    type Row = Record<string, string | number | null>
    const [customers, packages, bookings, visas, passports, tickets] = await Promise.all([
      rows<Row>('customers', 'id, name'),
      rows<Row>('packages', 'id, name, days'),
      rows<Row>('bookings', 'id, customer_id, package_id, destination, depart_date, pax, status'),
      rows<Row>('visas', 'id, customer_id, kind, stage, deadline'),
      rows<Row>('passports', 'id, customer_id, kind, stage, deadline'),
      rows<Row>('tickets', 'id, customer_id, direction, from_place, to_place, airline, ticket_date'),
    ])
    const s = (v: unknown) => String(v ?? '')
    const d = (v: unknown) => (v ? String(v) : undefined)
    return {
      customers: customers.map((r) => ({ id: s(r.id), name: s(r.name) })),
      packages: packages.map((r) => ({ id: s(r.id), name: s(r.name), days: Number(r.days) })),
      bookings: bookings.map((r) => ({ id: s(r.id), customerId: s(r.customer_id), packageId: s(r.package_id), destination: s(r.destination), departDate: s(r.depart_date), pax: Number(r.pax), status: s(r.status) })),
      visas: visas.map((r) => ({ id: s(r.id), customerId: s(r.customer_id), kind: s(r.kind), stage: s(r.stage), deadline: d(r.deadline) })),
      passports: passports.map((r) => ({ id: s(r.id), customerId: s(r.customer_id), kind: s(r.kind), stage: s(r.stage), deadline: d(r.deadline) })),
      tickets: tickets.map((r) => ({ id: s(r.id), customerId: s(r.customer_id), direction: s(r.direction), from: s(r.from_place), to: s(r.to_place), airline: s(r.airline), date: s(r.ticket_date) })),
    }
  },
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
  try {
    const out = await handleFeed(new URL(req.url).searchParams.get('token'), store)
    return new Response(req.method === 'HEAD' ? null : out.body, { status: out.status, headers: out.headers })
  } catch {
    // Nothing from the error goes to the caller (it could contain the link code).
    return new Response('Something went wrong', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
})
