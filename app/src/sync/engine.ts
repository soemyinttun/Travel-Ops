/**
 * One sync pass: upload local changes, then download changes from other devices.
 *
 * Conflict rule: the last change to reach the cloud wins. A downloaded record never overwrites a
 * local record that still has an unsent change; that local change is uploaded on the next pass.
 */
import { db, table } from '../db'
import { TABLES, type TableName } from '../types'
import type { Cursor, RemoteStore } from './remote'

const PUSH_BATCH = 500
const PULL_PAGE = 1000
/**
 * Each download starts this far before the last position seen, so a change saved in the cloud a
 * moment late (a slow transaction) is still picked up. Re-applying a row is harmless.
 */
const OVERLAP_MS = 60_000

const cursorKey = (t: TableName) => `cursor:${t}`

function rewind(c: Cursor): Cursor | null {
  const ms = Date.parse(c.updatedAt.replace(/(\.\d{3})\d+/, '$1'))
  return Number.isNaN(ms) ? null : { updatedAt: new Date(ms - OVERLAP_MS).toISOString(), id: '' }
}

/** A record the cloud refused (for example a value the database rules reject). */
export interface RowFailure { table: TableName; id: string; message: string }

/** Some records could not be uploaded; the rest were. Sync tries the failed ones again next time. */
export class SyncRowsError extends Error {
  constructor(readonly failures: RowFailure[]) {
    const shown = failures.slice(0, 3).map((f) => `${f.table} ${f.id.slice(0, 8)}: ${f.message}`).join('; ')
    super(`${failures.length} record(s) could not be uploaded — ${shown}${failures.length > 3 ? '…' : ''}`)
  }
}

/** A failure that says "no connection" rather than "this record is bad": do not retry row by row. */
const looksOffline = (e: unknown) => navigator.onLine === false || /failed to fetch|networkerror|network request failed|load failed/i.test((e as Error).message ?? '')

/** Mark records as synced only if they were not edited again while uploading. */
async function markSynced(t: TableName, batch: { id: string; _rev: number }[]) {
  await db.transaction('rw', table(t), async () => {
    const now = await table(t).bulkGet(batch.map((r) => r.id))
    const done = now.filter((cur, j) => cur && cur._rev === batch[j]!._rev).map((cur) => ({ ...cur!, _dirty: 0 as const }))
    await table(t).bulkPut(done)
  })
}

async function push(remote: RemoteStore, t: TableName): Promise<{ attempted: number; failures: RowFailure[] }> {
  const dirty = await table(t).where('_dirty').equals(1).toArray()
  const failures: RowFailure[] = []
  const strip = ({ _dirty, _rev, ...row }: (typeof dirty)[number]) => row
  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH)
    try {
      await remote.push(t, batch.map(strip))
      await markSynced(t, batch)
    } catch (e) {
      if (looksOffline(e)) throw e
      // The cloud applies a batch all-or-nothing, so one bad record fails them all. Retry one by one
      // so the good records still upload and the bad ones are named.
      for (const row of batch) {
        try {
          await remote.push(t, [strip(row)])
          await markSynced(t, [row])
        } catch (rowError) {
          if (looksOffline(rowError)) throw rowError
          failures.push({ table: t, id: row.id, message: (rowError as Error).message.replace(/^Upload to \w+ failed: /, '') })
        }
      }
    }
  }
  return { attempted: dirty.length, failures }
}

async function pull(remote: RemoteStore, t: TableName): Promise<number> {
  const saved = (await db.meta.get(cursorKey(t)))?.value as Cursor | undefined
  let after = saved ? rewind(saved) : null
  let last: Cursor | undefined
  let applied = 0
  for (;;) {
    const rows = await remote.pullSince(t, after, PULL_PAGE)
    if (!rows.length) break
    await db.transaction('rw', table(t), async () => {
      const local = await table(t).bulkGet(rows.map((r) => r.id))
      const writes = rows.flatMap((r, i) => {
        const cur = local[i]
        if (cur?._dirty) return [] // keep the unsent local change
        return [{ ...r, _dirty: 0 as const, _rev: cur?._rev ?? 0 }]
      })
      await table(t).bulkPut(writes as never[])
      applied += writes.length
    })
    const tail = rows[rows.length - 1]!
    last = { updatedAt: tail.updatedAt, id: tail.id }
    after = last
    if (rows.length < PULL_PAGE) break
  }
  if (last && (!saved || last.updatedAt >= saved.updatedAt)) await db.meta.put({ key: cursorKey(t), value: last })
  return applied
}

export async function syncOnce(remote: RemoteStore): Promise<{ pushed: number; pulled: number }> {
  let pushed = 0, pulled = 0
  const failures: RowFailure[] = []
  for (const t of TABLES) { // parents first (customers, packages)
    const r = await push(remote, t)
    pushed += r.attempted - r.failures.length
    failures.push(...r.failures)
  }
  for (const t of TABLES) pulled += await pull(remote, t)
  if (failures.length) throw new SyncRowsError(failures)
  return { pushed, pulled }
}

/** Forget download positions (after sign-out the next user downloads everything again). */
export async function resetCursors() {
  await db.meta.bulkDelete(TABLES.map(cursorKey))
}
