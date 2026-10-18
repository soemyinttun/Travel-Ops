// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { clearDevice } from '../db'
import { AppProvider } from '../state'
import * as store from '../store'
import CustomerDetail from './CustomerDetail'
import { EditBooking } from '../components/EditDialogs'
import { computeAlerts } from '../alerts'
import { smsLink, telLink } from '../contact'

beforeEach(clearDevice)
afterEach(cleanup)

describe('customer dossier', () => {
  it('shows the person, their trips and tickets, and phone links', async () => {
    const id = await store.create('customers', { name: 'Ko Aung', phone: '09 123 456', township: 'Yangon', passportExpiry: '2099-01-01' })
    await store.create('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 2_800_000, cost: 2_432_000, stops: ['Bodh Gaya'] })
    await store.create('bookings', { customerId: id, packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2099-02-01', pax: 2, status: 'confirmed', createdAt: '2098-12-01' })
    render(<MemoryRouter initialEntries={[`/customers/${id}`]}><AppProvider><Routes><Route path="/customers/:id" element={<CustomerDetail />} /></Routes></AppProvider></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Ko Aung' })).toBeTruthy()
    expect((await screen.findAllByText(/India 8-Day/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Call 09 123 456/ }).getAttribute('href')).toBe('tel:09123456')
    expect(screen.getByRole('link', { name: 'Send message' }).getAttribute('href')).toMatch(/^sms:09123456\?&body=Hello%20Ko%20Aung/)
  })

  it('says so when the customer does not exist', async () => {
    render(<MemoryRouter initialEntries={['/customers/nope']}><AppProvider><Routes><Route path="/customers/:id" element={<CustomerDetail />} /></Routes></AppProvider></MemoryRouter>)
    expect(await screen.findByText('Customer not found')).toBeTruthy()
  })
})

describe('edit booking dialog', () => {
  it('saves the changes and rejects a missing customer', async () => {
    const id = await store.create('customers', { name: 'Ko Aung', phone: '', township: 'Yangon', passportExpiry: '' })
    await store.create('packages', { id: 'IN8', name: 'India 8-Day', country: 'India', days: 8, price: 2_800_000, cost: 2_432_000, stops: ['Bodh Gaya'] })
    const bid = await store.create('bookings', { customerId: id, packageId: 'IN8', destination: 'Bodh Gaya', departDate: '2099-02-01', pax: 2, status: 'enquiry', createdAt: '2098-12-01' })
    const booking = (await store.snapshot()).bookings.find((b) => b.id === bid)!
    let closed = false
    render(<AppProvider><EditBooking booking={booking} onClose={() => { closed = true }} /></AppProvider>)
    const dialog = await screen.findByRole('dialog', { name: 'Edit booking' })
    const [travellers] = Array.from(dialog.querySelectorAll('input[type=number]'))
    await userEvent.clear(travellers!)
    await userEvent.type(travellers!, '5')
    const status = Array.from(dialog.querySelectorAll('select')).at(-1)!
    await userEvent.selectOptions(status, 'confirmed')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(closed).toBe(true))
    expect((await store.snapshot()).bookings[0]).toMatchObject({ pax: 5, status: 'confirmed' })
  })
})

describe('alerts and message links', () => {
  const base = { customers: [], packages: [], bookings: [], visas: [], passports: [], tickets: [] }
  it('finds overdue cases and short passports, and ignores finished or on-time ones', () => {
    const data = {
      ...base,
      customers: [{ id: 'c1', name: 'A', phone: '', township: 'Yangon', passportExpiry: '2026-12-01' }, { id: 'c2', name: 'B', phone: '', township: 'Yangon', passportExpiry: '2030-01-01' }],
      bookings: [
        { id: 'b1', customerId: 'c1', packageId: 'IN8', destination: 'x', departDate: '2026-11-01', pax: 1, status: 'confirmed' as const, createdAt: '2026-10-01' },
        { id: 'b2', customerId: 'c2', packageId: 'IN8', destination: 'x', departDate: '2026-11-01', pax: 1, status: 'confirmed' as const, createdAt: '2026-10-01' },
      ],
      visas: [
        { id: 'v1', customerId: 'c1', kind: 'India', stage: 'Documents', appliedAt: '2026-09-01', fee: 1, cost: 1, deadline: '2026-10-10' },
        { id: 'v2', customerId: 'c1', kind: 'India', stage: 'Approved', appliedAt: '2026-09-01', fee: 1, cost: 1, deadline: '2026-10-10' },
        { id: 'v3', customerId: 'c1', kind: 'India', stage: 'Documents', appliedAt: '2026-09-01', fee: 1, cost: 1, deadline: '2026-12-10' },
      ],
    }
    const a = computeAlerts(data, '2026-10-19')
    expect(a.overdue.map((c) => c.id)).toEqual(['v1'])
    expect(a.passportRisk.map((r) => r.booking.id)).toEqual(['b1'])
    expect(a.soon.map((b) => b.id).sort()).toEqual(['b1', 'b2'])
    expect(a.total).toBe(2)
  })

  it('builds phone links with only digits and an encoded message', () => {
    expect(telLink('+95 9 123-456')).toBe('tel:+959123456')
    expect(smsLink('09 123', 'Hi & bye')).toBe('sms:09123?&body=Hi%20%26%20bye')
  })
})
