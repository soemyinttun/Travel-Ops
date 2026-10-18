// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import { clearDevice } from '../db'
import { AppProvider } from '../state'
import { AuthProvider } from '../auth/AuthProvider'
import * as store from '../store'
import Admin from './Admin'
import Bookings from './Bookings'

// A backup in the older numeric-id format, with amounts in kyat.
const backup = {
  customers: [{ id: 1, name: 'Daw Su', phone: '09123', township: 'Yangon', passportExpiry: '2030-01-01' }],
  packages: [{ id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 2_800_000, cost: 2_632_000, stops: ['Bodh Gaya'] }],
  bookings: [{ id: 7, customerId: 1, packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2024-10-20', pax: 2, status: 'completed', createdAt: '2024-10-01' }],
  visas: [], passports: [], tickets: [],
}
const backupFile = (data: unknown = backup) => new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' })

beforeEach(clearDevice)
afterEach(cleanup)

describe('Admin → import a backup (local-only mode)', () => {
  const renderAdmin = () => render(<AuthProvider><Admin /></AuthProvider>)
  const choose = async (file: File) => {
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText(file.name)
  }

  it('checks the file, shows a preview, and adds the records', async () => {
    renderAdmin()
    await choose(backupFile())
    expect(screen.getByRole('button', { name: 'Import' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByText('bookings').nextSibling!.textContent).toBe('1')
    await userEvent.click(screen.getByRole('button', { name: 'Import' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Imported 3 records \(added to current data\)/)
    const snap = await store.snapshot()
    expect([snap.customers.length, snap.packages.length, snap.bookings.length]).toEqual([1, 1, 1])
    expect(snap.bookings[0]!.customerId).toBe(snap.customers[0]!.id)
  })

  it('explains what is wrong with a broken file and does not import', async () => {
    renderAdmin()
    await choose(backupFile({ customers: [{ id: 1, name: '' }], bookings: [{ id: 1, customerId: 5, packageId: 'ZZ', departDate: '31/12/2024', pax: 0, status: 'paid', createdAt: '2024-01-01' }] }))
    expect(screen.getByRole('alert').textContent).toMatch(/can't be imported/)
    expect(screen.getByRole('alert').textContent).toMatch(/does not match any customer/)
    expect(screen.queryByRole('button', { name: 'Import' })).toBeNull()
    expect((await store.snapshot()).customers).toEqual([])
  })

  it('"Replace all data" needs REPLACE typed, then replaces everything', async () => {
    await store.create('customers', { name: 'Old customer', phone: '', township: 'Yangon', passportExpiry: '' })
    renderAdmin()
    await choose(backupFile())
    await userEvent.click(screen.getByRole('radio', { name: /Replace all data/ }))
    const importBtn = screen.getByRole('button', { name: 'Import' })
    expect(importBtn.hasAttribute('disabled')).toBe(true)
    await userEvent.type(screen.getByLabelText('Type REPLACE to confirm'), 'replace')
    expect(importBtn.hasAttribute('disabled')).toBe(true)
    await userEvent.clear(screen.getByLabelText('Type REPLACE to confirm'))
    await userEvent.type(screen.getByLabelText('Type REPLACE to confirm'), 'REPLACE')
    expect(importBtn.hasAttribute('disabled')).toBe(false)
    await userEvent.click(importBtn)
    await screen.findByText(/replaced all data/)
    expect((await store.snapshot()).customers.map((c) => c.name)).toEqual(['Daw Su'])
  })
})

describe('Bookings → add a booking', () => {
  it('creates an enquiry for the chosen customer and shows it in the list', async () => {
    const customerId = await store.create('customers', { name: 'Ko Aung', phone: '09', township: 'Yangon', passportExpiry: '' })
    await store.create('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 2_800_000, cost: 2_632_000, stops: ['Bodh Gaya'] })
    const { container } = render(<HashRouter><AppProvider><Bookings /></AppProvider></HashRouter>)

    await userEvent.click(await screen.findByRole('button', { name: /New enquiry/ }))
    await screen.findByText('New booking / enquiry')
    const [customerSelect] = Array.from(container.querySelectorAll('select'))
    await waitFor(() => expect(customerSelect!.querySelectorAll('option').length).toBeGreaterThan(1))
    await userEvent.selectOptions(customerSelect!, customerId)
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(async () => expect((await store.snapshot()).bookings.length).toBe(1))
    const [booking] = (await store.snapshot()).bookings
    expect(booking).toMatchObject({ customerId, packageId: 'IN8', pax: 2, status: 'enquiry', destination: 'Bodh Gaya' })
    // It appears in the bookings list with its value (2 travellers × 2,800,000).
    await waitFor(() => expect(container.querySelector('article')!.textContent).toMatch(/Ko Aung.*India 8-Day.*5,600,000 Ks/))
  })
})
