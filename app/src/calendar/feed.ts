import type { SupabaseClient } from '@supabase/supabase-js'
import type { Include } from '../ics'

/** The person's one live-calendar link, as stored in the database (supabase/migrations/0003). */
export interface FeedRow { user_id: string; token: string; include_trips: boolean; include_deadlines: boolean; include_flights: boolean }

const TABLE = 'calendar_feeds'
const asRow = (include: Include) => ({ include_trips: include.trips, include_deadlines: include.deadlines, include_flights: include.flights })
export const includeOf = (f: FeedRow): Include => ({ trips: f.include_trips, deadlines: f.include_deadlines, flights: f.include_flights })

/** The three ways to open one link: copy it, Apple Calendar (webcal), Google Calendar (adds it by address). */
export function feedUrls(host: string, token: string) {
  const https = `https://${host}/functions/v1/calendar?token=${token}`
  const webcal = `webcal://${host}/functions/v1/calendar?token=${token}`
  return { https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` }
}

async function me(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Sign in again to manage your calendar link.')
  return id
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/** My link, or null if I have not made one. */
export async function getFeed(client: SupabaseClient): Promise<FeedRow | null> {
  return check<FeedRow | null>(await client.from(TABLE).select('*').eq('user_id', await me(client)).maybeSingle())
}

/** Makes my link (or returns the one I already have). */
export async function createFeed(client: SupabaseClient, include: Include): Promise<FeedRow> {
  const user_id = await me(client)
  const existing = check<FeedRow | null>(await client.from(TABLE).select('*').eq('user_id', user_id).maybeSingle())
  if (existing) return existing
  return check<FeedRow>(await client.from(TABLE).insert({ user_id, ...asRow(include) }).select('*').single())
}

/** Changes what the link includes. */
export async function updateFeed(client: SupabaseClient, include: Include): Promise<FeedRow> {
  return check<FeedRow>(await client.from(TABLE).update(asRow(include)).eq('user_id', await me(client)).select('*').single())
}

/** Replaces the secret in the link. The old link stops working at once. */
export async function renewFeed(client: SupabaseClient): Promise<FeedRow> {
  return check<FeedRow>(await client.from(TABLE).update({ token: crypto.randomUUID() }).eq('user_id', await me(client)).select('*').single())
}

/** Switches my link off for good. */
export async function deleteFeed(client: SupabaseClient): Promise<void> {
  check(await client.from(TABLE).delete().eq('user_id', await me(client)))
}
