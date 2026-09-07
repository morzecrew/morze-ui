/**
 * Calendar arithmetic, in local time.
 *
 * The kit has no date dependency, and it deliberately never touches UTC: a
 * calendar grid is about the days a person sees on a wall, so every value is
 * normalised to local midnight before it is compared. Reading `getUTCDate()`
 * anywhere here would move a day across the date line for half the world.
 */

/** Local midnight of the day `date` falls in. */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isSameDay(a: Date | undefined, b: Date | undefined): boolean {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addDays(date: Date, amount: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

/**
 * Month arithmetic that never overflows: 31 January plus one month is 28 (or
 * 29) February, not 3 March. `setMonth` alone gives the latter, which made
 * "next month" skip February entirely from a 31st.
 */
export function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

/** Whole months from `a` to `b`, sign included. */
export function differenceInMonths(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime()
}

export function isWithin(date: Date, from: Date, to: Date): boolean {
  const t = startOfDay(date).getTime()
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime()
}

/**
 * The first weekday of a locale's week, 0 (Sunday) to 6.
 *
 * `Intl.Locale.prototype.getWeekInfo` is the authority but is recent
 * (Chrome 130, Safari 17), and it reports Sunday as 7 in the ISO numbering
 * this API inherited — hence the modulo. Where it is missing the fallback is
 * Monday, which is right for most of the world, with the handful of
 * Sunday-first locales the kit is likely to meet listed explicitly.
 */
const SUNDAY_FIRST = /^(en-US|en-CA|en-AU|en-PH|en-ZA|ja|ko|zh|he|ar|pt-BR)\b/i

export function localeWeekStart(locale?: string): number {
  if (!locale) return 1
  try {
    const info = (
      new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number } }
    ).getWeekInfo?.()
    if (info) return info.firstDay % 7
  } catch {
    // An unparseable locale tag falls through to the table below.
  }
  return SUNDAY_FIRST.test(locale) ? 0 : 1
}

/**
 * The 6×7 grid a month is drawn on, starting on `weekStartsOn`.
 *
 * Always six rows, never five: a grid that changes height between months
 * makes the whole popover jump as you page through it.
 */
export function monthGrid(month: Date, weekStartsOn: number): Date[] {
  const first = startOfMonth(month)
  const lead = (first.getDay() - weekStartsOn + 7) % 7
  const start = addDays(first, -lead)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** ISO-8601 week number — the one that belongs beside a Monday-first grid. */
export function isoWeek(date: Date): number {
  const d = startOfDay(date)
  // Thursday decides the year a week belongs to.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
}
