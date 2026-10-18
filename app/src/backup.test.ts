import { describe, expect, it } from 'vitest'
import { backupAgeDays, backupStatus } from './backup'

const now = new Date('2026-10-20T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000 - 3_600_000)

describe('backup reminder', () => {
  it('says so when there has never been a backup', () => {
    expect(backupAgeDays(now, null)).toBeNull()
    expect(backupStatus(now, null)).toEqual({ text: 'No backup has been downloaded on this device yet.', due: true })
  })
  it('counts whole days', () => {
    expect(backupAgeDays(now, new Date('2026-10-20T00:00:00Z'))).toBe(0)
    expect(backupAgeDays(now, daysAgo(3))).toBe(3)
  })
  it('is due from 7 days on', () => {
    expect(backupStatus(now, daysAgo(0))).toEqual({ text: 'Last backup downloaded today.', due: false })
    expect(backupStatus(now, daysAgo(1)).text).toBe('Last backup downloaded 1 day ago.')
    expect(backupStatus(now, daysAgo(6)).due).toBe(false)
    expect(backupStatus(now, daysAgo(7))).toEqual({ text: 'Last backup downloaded 7 days ago.', due: true })
  })
})
