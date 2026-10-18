// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { clearDevice } from '../db'
import { AppProvider } from '../state'
import { AuthProvider } from '../auth/AuthProvider'
import * as store from '../store'
import { EditPackage } from '../components/EditPackage'
import More from './More'

beforeEach(clearDevice)
afterEach(cleanup)

describe('new package dialog', () => {
  it('asks for what is missing, then adds the package with a code', async () => {
    // The app loads local demo data into an empty device, so start with one package like a used device.
    await store.create('packages', { id: 'OLD', name: 'Existing', country: 'India', days: 5, price: 1, cost: 0, stops: ['Bodh Gaya'] })
    let closed = false
    render(<AppProvider><EditPackage onClose={() => { closed = true }} /></AppProvider>)
    await userEvent.click(await screen.findByRole('button', { name: 'Add package' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/name/)
    expect(closed).toBe(false)

    await userEvent.type(screen.getByPlaceholderText(/India 8-Day/), 'India 6-Day Test')
    const dialog = screen.getByRole('dialog')
    const [days, price, cost] = Array.from(dialog.querySelectorAll('input[type=number]'))
    await userEvent.clear(days!); await userEvent.type(days!, '6')
    await userEvent.type(price!, '2000000')
    await userEvent.type(cost!, '2500000')
    await userEvent.click(screen.getByRole('button', { name: 'Bodh Gaya' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add package' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/cost must be between/)

    await userEvent.clear(cost!); await userEvent.type(cost!, '1700000')
    await userEvent.click(screen.getByRole('button', { name: 'Add package' }))
    await waitFor(() => expect(closed).toBe(true))
    const p = (await store.snapshot()).packages.find((x) => x.id !== 'OLD')
    expect(p).toMatchObject({ name: 'India 6-Day Test', country: 'India', days: 6, price: 2_000_000, cost: 1_700_000, stops: ['Bodh Gaya'] })
    expect(p?.id).toMatch(/^IN6-\d{3}$/)
  })
})

describe('search on the More screen', () => {
  it('finds customers by name and phone and shows nothing-found otherwise', async () => {
    await store.create('packages', { id: 'OLD', name: 'Existing', country: 'India', days: 5, price: 1, cost: 0, stops: ['Bodh Gaya'] })
    await store.create('customers', { name: 'Daw Hla Hla', phone: '09 777 111', township: 'Mandalay', passportExpiry: '' })
    render(<MemoryRouter><AuthProvider><AppProvider><More /></AppProvider></AuthProvider></MemoryRouter>)
    const box = await screen.findByLabelText('Search customers, trips, packages')
    await userEvent.type(box, '777')
    const link = await screen.findByRole('link', { name: /Daw Hla Hla/ })
    expect(link.getAttribute('href')).toMatch(/^\/customers\//)
    await userEvent.clear(box)
    await userEvent.type(box, 'zzzz')
    expect(await screen.findByText('Nothing found')).toBeTruthy()
  })
})
