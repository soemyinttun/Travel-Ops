/**
 * Runs sync automatically: on start, when the device comes back online, every minute while
 * online, shortly after any local change, and when another device changes data (realtime).
 * Exposes a status the header shows.
 */
import { useSyncExternalStore } from 'react'
import { onLocalWrite, pendingCount } from '../store'
import { SyncRowsError, syncOnce, type RowFailure } from './engine'
import type { RemoteStore } from './remote'

export interface SyncStatus {
  state: 'off' | 'syncing' | 'synced' | 'offline' | 'error'
  pending: number
  lastSynced?: string
  error?: string
  /** Records the cloud refused (the rest were uploaded). */
  failures?: RowFailure[]
}

const INTERVAL_MS = 60_000
const AFTER_WRITE_MS = 2_000

let status: SyncStatus = { state: 'off', pending: 0 }
const listeners = new Set<() => void>()
function setStatus(p: Partial<SyncStatus>) {
  status = { ...status, ...p }
  listeners.forEach((l) => l())
}

let remote: RemoteStore | null = null
let running: Promise<void> | null = null
let again = false
let writeTimer: ReturnType<typeof setTimeout> | undefined
let stopFns: (() => void)[] = []

async function run() {
  if (!remote) return
  if (!navigator.onLine) { setStatus({ state: 'offline', pending: await pendingCount() }); return }
  setStatus({ state: 'syncing' })
  try {
    await syncOnce(remote)
    setStatus({ state: 'synced', lastSynced: new Date().toISOString(), error: undefined, failures: undefined, pending: await pendingCount() })
  } catch (e) {
    setStatus({
      state: navigator.onLine ? 'error' : 'offline', error: (e as Error).message, pending: await pendingCount(),
      failures: e instanceof SyncRowsError ? e.failures : undefined,
    })
  }
}

/** Starts a sync now, or right after the one in progress. */
export function requestSync(): Promise<void> {
  if (running) { again = true; return running }
  running = (async () => {
    do { again = false; await run() } while (again)
  })().finally(() => { running = null })
  return running
}

export function startSync(r: RemoteStore) {
  stopSync()
  remote = r
  onLocalWrite(() => {
    void pendingCount().then((pending) => setStatus({ pending }))
    clearTimeout(writeTimer)
    writeTimer = setTimeout(() => void requestSync(), AFTER_WRITE_MS)
  })
  const online = () => void requestSync()
  const offline = () => setStatus({ state: 'offline' })
  window.addEventListener('online', online)
  window.addEventListener('offline', offline)
  const timer = setInterval(() => void requestSync(), INTERVAL_MS)
  const unsubscribe = r.subscribe(() => void requestSync())
  stopFns = [
    () => window.removeEventListener('online', online),
    () => window.removeEventListener('offline', offline),
    () => clearInterval(timer),
    unsubscribe,
  ]
  void requestSync()
}

export function stopSync() {
  stopFns.forEach((f) => f())
  stopFns = []
  clearTimeout(writeTimer)
  onLocalWrite(() => {})
  remote = null
  setStatus({ state: 'off', pending: 0, lastSynced: undefined, error: undefined, failures: undefined })
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status)
}
