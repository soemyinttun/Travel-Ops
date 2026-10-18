import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearDevice, table } from '../db'
import * as store from '../store'
import { TABLES, type TableName } from '../types'
import { SyncRowsError, syncOnce } from './engine'
import type { Cursor, RemoteRow, RemoteStore } from './remote'

/**
 * In-memory stand-in for the cloud database (TEST ONLY): it stamps updatedAt with its own clock,
 * like the real database, and lets a test act as "another device".
 */
class FakeCloud implements RemoteStore {
  rows = new Map<TableName, Map<string, RemoteRow>>(TABLES.map((t) => [t, new Map()]))
  private clock = Date.parse('2026-01-01T00:00:00Z')
  online = true
  pushCalls = 0
  /** Like a database rule: the whole batch fails if any row in it matches. */
  rejectRow: ((t: TableName, row: Record<string, unknown>) => boolean) | null = null
  beforePush: (() => Promise<void>) | null = null
  private stampNow() { this.clock += 1000; return new Date(this.clock).toISOString() }

  async push(t: TableName, rows: Record<string, unknown>[]) {
    this.pushCalls++
    if (!this.online) throw new Error('Failed to fetch')
    if (this.rejectRow && rows.some((r) => this.rejectRow!(t, r))) throw new Error('Upload to customers failed: new row violates check constraint')
    if (this.beforePush) { const f = this.beforePush; this.beforePush = null; await f() }
    for (const r of rows) this.rows.get(t)!.set(r['id'] as string, { ...r, updatedAt: this.stampNow() } as RemoteRow)
  }
  async pullSince(t: TableName, after: Cursor | null, limit: number) {
    if (!this.online) throw new Error('Failed to fetch')
    const all = [...this.rows.get(t)!.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id))
    return all.filter((r) => !after || (after.id === '' ? r.updatedAt >= after.updatedAt : r.updatedAt > after.updatedAt || (r.updatedAt === after.updatedAt && r.id > after.id))).slice(0, limit)
  }
  subscribe() { return () => {} }
  /** A change made on another device. */
  otherDevice(t: TableName, row: Record<string, unknown>) { this.rows.get(t)!.set(row['id'] as string, { ...row, updatedAt: this.stampNow() } as RemoteRow) }
}

const customer = (name: string) => ({ name, phone: '', township: 'Yangon', passportExpiry: '' })
let cloud: FakeCloud
beforeEach(async () => { await clearDevice(); cloud = new FakeCloud() })

describe('sync engine', () => {
  it('uploads local changes and marks them synced', async () => {
    const id = await store.create('customers', customer('Ko Aung'))
    const r = await syncOnce(cloud)
    expect(r.pushed).toBe(1)
    const up = cloud.rows.get('customers')!.get(id)!
    expect(up['name']).toBe('Ko Aung')
    expect(Object.keys(up)).not.toContain('_dirty')
    expect((await table('customers').get(id))!._dirty).toBe(0)
    expect(await store.pendingCount()).toBe(0)
  })

  it('downloads changes made on another device', async () => {
    cloud.otherDevice('customers', { id: 'c-remote', ...customer('Daw Hla') })
    await syncOnce(cloud)
    expect(await table('customers').get('c-remote')).toMatchObject({ name: 'Daw Hla', _dirty: 0 })
    cloud.otherDevice('customers', { id: 'c-remote', ...customer('Daw Hla Hla') })
    await syncOnce(cloud)
    expect((await table('customers').get('c-remote'))!.name).toBe('Daw Hla Hla')
  })

  it('spreads deletions both ways', async () => {
    const id = await store.create('customers', customer('Mine'))
    cloud.otherDevice('customers', { id: 'theirs', ...customer('Theirs') })
    await syncOnce(cloud)
    await store.remove('customers', id)
    cloud.otherDevice('customers', { id: 'theirs', ...customer('Theirs'), deleted: true })
    await syncOnce(cloud)
    expect(cloud.rows.get('customers')!.get(id)!['deleted']).toBe(true)
    expect((await table('customers').get('theirs'))!.deleted).toBe(true)
    expect((await store.snapshot()).customers).toEqual([])
  })

  it('keeps a local edit made during an upload, and does not let a download overwrite it', async () => {
    const id = await store.create('customers', customer('First'))
    // While the first version uploads: this device edits again, and another device also edits.
    cloud.beforePush = async () => {
      await store.patch('customers', id, { name: 'Second (local)' })
      cloud.otherDevice('customers', { id, ...customer('Other device') })
    }
    await syncOnce(cloud)
    const local = await table('customers').get(id)
    expect(local).toMatchObject({ name: 'Second (local)', _dirty: 1 })
    // Next pass uploads the local edit: the last change to reach the cloud wins.
    await syncOnce(cloud)
    expect(cloud.rows.get('customers')!.get(id)!['name']).toBe('Second (local)')
    expect((await table('customers').get(id))!._dirty).toBe(0)
  })

  it('queues changes while offline and sends them when back online', async () => {
    await store.create('customers', customer('Offline 1'))
    await store.create('customers', customer('Offline 2'))
    cloud.online = false
    await expect(syncOnce(cloud)).rejects.toThrow()
    expect(await store.pendingCount()).toBe(2)
    cloud.online = true
    await syncOnce(cloud)
    expect(await store.pendingCount()).toBe(0)
    expect(cloud.rows.get('customers')!.size).toBe(2)
  })

  it('one bad record no longer blocks the others: good ones upload, the bad one is named', async () => {
    const good1 = await store.create('customers', customer('Good 1'))
    const bad = await store.create('customers', customer('BAD'))
    const good2 = await store.create('customers', customer('Good 2'))
    cloud.rejectRow = (_t, row) => row['name'] === 'BAD'
    const error = await syncOnce(cloud).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SyncRowsError)
    const failures = (error as SyncRowsError).failures
    expect(failures).toEqual([{ table: 'customers', id: bad, message: 'new row violates check constraint' }])
    expect([...cloud.rows.get('customers')!.keys()].sort()).toEqual([good1, good2].sort())
    expect(await store.pendingCount()).toBe(1)
    // After the record is fixed, the next sync uploads it.
    await store.patch('customers', bad, { name: 'Fixed' })
    await syncOnce(cloud)
    expect(cloud.rows.get('customers')!.size).toBe(3)
    expect(await store.pendingCount()).toBe(0)
  })

  it('still downloads changes from other devices when some records fail to upload', async () => {
    await store.create('customers', customer('BAD'))
    cloud.otherDevice('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 1, cost: 1, stops: [] })
    cloud.rejectRow = (_t, row) => row['name'] === 'BAD'
    await expect(syncOnce(cloud)).rejects.toBeInstanceOf(SyncRowsError)
    expect(await table('packages').get('IN8')).toMatchObject({ name: 'India 8-Day' })
  })

  it('does not retry row by row when the problem is no connection', async () => {
    for (let i = 0; i < 5; i++) await store.create('customers', customer(`C${i}`))
    cloud.online = false
    await expect(syncOnce(cloud)).rejects.toThrow('Failed to fetch')
    expect(cloud.pushCalls).toBe(1)
    expect(await store.pendingCount()).toBe(5)
  })

  it('uploads parents before children so references are valid', async () => {
    const order: string[] = []
    const push = cloud.push.bind(cloud)
    cloud.push = async (t, rows) => { order.push(t); return push(t, rows) }
    const cid = await store.create('customers', customer('A'))
    await store.create('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 1, cost: 1, stops: [] })
    await store.create('bookings', { customerId: cid, packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2024-10-01', pax: 1, status: 'enquiry', createdAt: '2024-09-01' })
    await syncOnce(cloud)
    expect(order).toEqual(['customers', 'packages', 'bookings'])
  })

  it('downloads large tables in pages without missing rows', async () => {
    for (let i = 0; i < 2500; i++) cloud.otherDevice('tickets', { id: `t${String(i).padStart(5, '0')}`, customerId: 'c', direction: 'Outbound', from: 'Yangon', to: 'Delhi', airline: '', date: '2024-01-01', fare: 1, commission: 1 })
    const r = await syncOnce(cloud)
    expect(r.pulled).toBe(2500)
    expect(await table('tickets').count()).toBe(2500)
    // A second pass re-reads only the overlap window and changes nothing.
    await syncOnce(cloud)
    expect(await table('tickets').count()).toBe(2500)
  })
})
