// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clearDevice } from '../db'
import { AppProvider } from '../state'
import * as store from '../store'
import { CalendarDialog } from './CalendarDialog'

/** A tiny stand-in for the Supabase table "calendar_feeds" (one row per person). */
function fakeClient(initial: Record<string, unknown> | null = null) {
  let row = initial
  const calls: string[] = []
  const query = (mode: 'select' | 'update' | 'delete' | 'insert', patch?: Record<string, unknown>) => {
    const q = {
      eq: () => q,
      select: () => q,
      maybeSingle: async () => ({ data: row, error: null }),
      single: async () => ({ data: row, error: null }),
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: row, error: null }).then(ok),
    }
    calls.push(mode)
    if (mode === 'insert') row = { token: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', include_trips: true, include_deadlines: true, include_flights: true, ...patch }
    if (mode === 'update' && row) row = { ...row, ...patch }
    if (mode === 'delete') row = null
    return q
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }) },
    from: () => ({
      select: () => query('select'),
      insert: (p: Record<string, unknown>) => query('insert', p),
      update: (p: Record<string, unknown>) => query('update', p),
      delete: () => query('delete'),
    }),
  } as unknown as SupabaseClient
  return { client, calls, get row() { return row } }
}

beforeEach(async () => {
  await clearDevice()
  vi.stubGlobal('confirm', () => true)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const open = async (props: Parameters<typeof CalendarDialog>[0]) => {
  // The app loads demo data into an empty device, so start with one package like a used device.
  await store.create('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 1, cost: 0, stops: ['Bodh Gaya'] })
  render(<AppProvider><CalendarDialog {...props} /></AppProvider>)
  await screen.findByRole('dialog', { name: 'Add to calendar' })
}

describe('Add to calendar dialog', () => {
  it('on a device without cloud sync: explains the live link needs sign-in and downloads a file', async () => {
    let saved = ''
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => { void b.text().then((t) => { saved = t }); return 'blob:x' }, revokeObjectURL: () => {} }))
    const cid = await store.create('customers', { name: 'Ko Aung', phone: '', township: 'Yangon', passportExpiry: '' })
    await open({ onClose: () => {}, client: null, host: null })
    await store.create('bookings', { customerId: cid, packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2099-03-01', pax: 1, status: 'confirmed', createdAt: '2099-01-01' })
    expect(screen.getByText(/needs cloud sync/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create my link' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Download .ics file' }))
    await waitFor(() => expect(saved).toContain('SUMMARY:Ko Aung · India 8-Day'))
    expect(saved).toContain('X-WR-CALNAME:SSM Travel Ops')
  })

  it('creates a link and offers Google, Apple and copy with the right addresses', async () => {
    const f = fakeClient()
    await open({ onClose: () => {}, client: f.client, host: 'abc.supabase.co' })
    await userEvent.click(await screen.findByRole('button', { name: 'Create my link' }))
    const google = await screen.findByRole('link', { name: 'Add to Google Calendar' })
    const webcal = 'webcal://abc.supabase.co/functions/v1/calendar?token=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
    expect(google.getAttribute('href')).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`)
    expect(screen.getByRole('link', { name: 'Add to Apple Calendar' }).getAttribute('href')).toBe(webcal)
    expect(screen.getByText(/Keep the link private/)).toBeTruthy()
  })

  it('shows an existing link with its saved choices, and saves a changed choice', async () => {
    const f = fakeClient({ token: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', include_trips: true, include_deadlines: false, include_flights: true })
    await open({ onClose: () => {}, client: f.client, host: 'abc.supabase.co' })
    await screen.findByRole('link', { name: 'Add to Apple Calendar' })
    const deadlines = screen.getByRole('checkbox', { name: /Visa and passport deadlines/ }) as HTMLInputElement
    expect(deadlines.checked).toBe(false)
    await userEvent.click(deadlines)
    await waitFor(() => expect(f.row).toMatchObject({ include_deadlines: true }))
    expect(await screen.findByText('Link updated.')).toBeTruthy()
  })

  it('cannot untick the last thing', async () => {
    await open({ onClose: () => {}, client: null, host: null })
    for (const name of [/Confirmed trips/, /Visa and passport deadlines/]) await userEvent.click(screen.getByRole('checkbox', { name }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Flights/ }))
    expect((screen.getByRole('checkbox', { name: /Flights/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('a new link replaces the secret; turning off removes the link', async () => {
    const f = fakeClient({ token: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', include_trips: true, include_deadlines: true, include_flights: true })
    vi.stubGlobal('crypto', { randomUUID: () => 'cccccccc-cccc-4ccc-cccc-cccccccccccc' })
    await open({ onClose: () => {}, client: f.client, host: 'abc.supabase.co' })
    await userEvent.click(await screen.findByRole('button', { name: 'Make a new link' }))
    await waitFor(() => expect(f.row).toMatchObject({ token: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' }))
    expect(screen.getByRole('link', { name: 'Add to Apple Calendar' }).getAttribute('href')).toContain('cccccccc-cccc-4ccc-cccc-cccccccccccc')
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(await screen.findByRole('button', { name: 'Create my link' })).toBeTruthy()
    expect(f.row).toBeNull()
  })
})
