import type { Case, Customer, Data, Booking } from './types'
import { daysBetween } from './components/ui'

const CASE_DONE = ['Approved', 'Delivered', 'Rejected', 'Ready', 'Collected']

export interface Alerts {
  /** Visa / passport cases past their deadline and not finished. */
  overdue: (Case & { type: 'Visa' | 'Passport' })[]
  /** Confirmed trips where the traveller's passport is valid for less than 6 months at departure. */
  passportRisk: { booking: Booking; customer: Customer }[]
  /** Confirmed trips leaving within 14 days. */
  soon: Booking[]
  total: number
}

/** Things that need someone to act today. One place, so Overview, the bell and Customers agree. */
export function computeAlerts(data: Data, today: string): Alerts {
  const overdue = [
    ...data.visas.map((c) => ({ ...c, type: 'Visa' as const })),
    ...data.passports.map((c) => ({ ...c, type: 'Passport' as const })),
  ].filter((c) => c.deadline && c.deadline < today && !CASE_DONE.includes(c.stage))
  const confirmed = data.bookings.filter((b) => b.status === 'confirmed' && b.departDate >= today)
  const byId = new Map(data.customers.map((c) => [c.id, c]))
  const passportRisk = confirmed
    .map((booking) => ({ booking, customer: byId.get(booking.customerId)! }))
    .filter(({ booking, customer }) => customer && customer.passportExpiry && daysBetween(booking.departDate, customer.passportExpiry) < 180)
  const soon = confirmed.filter((b) => daysBetween(today, b.departDate) <= 14).sort((a, b) => a.departDate.localeCompare(b.departDate))
  return { overdue, passportRisk, soon, total: overdue.length + passportRisk.length }
}
