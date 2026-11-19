// et.ts — Eastern Time is the gold standard for the whole dashboard, regardless of the device's timezone.
//
// Rules:
//  * "today"/"now" for any calendar-day logic = etNow()/etToday(), never `new Date()` / `new Date().toISOString().slice(0,10)`
//    (the latter is the UTC day, which flips to tomorrow at 7-8 pm ET).
//  * Instants (created_at, updated_at...) stay real instants (store with `new Date().toISOString()`); only DISPLAY them in ET
//    via formatters.ts (wallET).
//  * Date-only strings ("2026-11-18") are calendar days, not instants: parse them with parseISO / ymd(), never new Date('YYYY-MM-DD')
//    (that is UTC midnight = the previous evening in ET).
//  * etNow() returns a "wall-clock" Date: its LOCAL getters (getHours, getDate, ...) and date-fns format() read ET wall time.
//    Do not call .toISOString()/.getTime() on it as if it were an instant.
export const ET_TZ = 'America/New_York';

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Convert an instant to a Date whose local fields equal that instant's Eastern wall-clock time. */
export const wallET = (d: Date): Date => {
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(d)) if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
  return new Date(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
};

/** "Now" as Eastern wall-clock time (see note above). */
export const etNow = (): Date => wallET(new Date());

/** Local-field YYYY-MM-DD of a wall-clock/calendar Date (no UTC conversion). */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today's Eastern calendar day, YYYY-MM-DD. */
export const etToday = (): string => ymd(etNow());

/** The Eastern calendar day of an instant (ISO string with offset/Z, epoch ms, or Date). */
export const etDateOf = (instant: Date | string | number): string => ymd(wallET(new Date(instant)));

/** True when a string carries an explicit timezone (Z or +hh:mm), i.e. it is an instant, not a calendar day. */
export const hasTz = (s: string): boolean => /(?:Z|[+-]\d{2}:?\d{2})$/.test(s.trim());
