import { plusDay, type CalEvent } from '../../supabase/functions/calendar/calendar'

// The event and .ics logic lives next to the Edge Function that serves the live calendar link,
// so the app, the file download and the link always produce the same events.
export { buildEvents, buildICS, fold, handleFeed, INCLUDE_ALL, plusDay } from '../../supabase/functions/calendar/calendar'
export type { CalEvent, CalendarInput, Feed, FeedDb, FeedResponse, Include } from '../../supabase/functions/calendar/calendar'

const compact = (d: string) => d.replace(/-/g, '')

/** One event as a ready-to-save Google Calendar page (works on any phone or computer). */
export function googleCalendarUrl(e: CalEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${compact(e.start)}/${compact(plusDay(e.end ?? e.start))}`,
    details: e.desc ?? '',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function download(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
