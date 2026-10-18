/**
 * Downloading a full backup, and remembering when it was last done so the app can remind people.
 * Backups are files on the person's own device; they never go to GitHub or any public place.
 */
import { companyDay } from './dates'
import { download } from './ics'
import { snapshot } from './store'
import { requestSync } from './sync/controller'

const KEY = 'travelops.lastBackup'
export const BACKUP_REMINDER_DAYS = 7

export function lastBackupAt(): Date | null {
  try {
    const v = localStorage.getItem(KEY)
    const d = v ? new Date(v) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  } catch {
    return null
  }
}

/** Whole days since the last backup, or null if there has never been one. */
export function backupAgeDays(now: Date = new Date(), last: Date | null = lastBackupAt()): number | null {
  return last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : null
}

/** Human text for the reminder, and whether it is time to back up. */
export function backupStatus(now: Date = new Date(), last: Date | null = lastBackupAt()): { text: string; due: boolean } {
  const age = backupAgeDays(now, last)
  if (age === null) return { text: 'No backup has been downloaded on this device yet.', due: true }
  const text = age === 0 ? 'Last backup downloaded today.' : `Last backup downloaded ${age} day${age === 1 ? '' : 's'} ago.`
  return { text, due: age >= BACKUP_REMINDER_DAYS }
}

/** Saves all current data as a JSON file. With cloud sync, syncs first so the file is up to date. */
export async function downloadBackup() {
  await requestSync()
  download(`travelops-backup-${companyDay()}.json`, JSON.stringify(await snapshot(), null, 2), 'application/json')
  try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* private mode */ }
}
