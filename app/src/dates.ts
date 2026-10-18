/**
 * Calendar days in the company's time zone. `new Date().toISOString()` gives the UTC day, which
 * is the previous day in Myanmar between 00:00 and 06:30 local time (Myanmar is UTC+6:30).
 */
export const COMPANY_TIMEZONE = 'Asia/Yangon'

const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: COMPANY_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** YYYY-MM-DD of `at` as seen in Myanmar. */
export const companyDay = (at: Date = new Date()): string => formatter.format(at)
