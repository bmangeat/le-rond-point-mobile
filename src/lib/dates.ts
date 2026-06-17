/**
 * Date helpers. Presences are stored at UTC midnight (YYYY-MM-DDT00:00:00.000Z);
 * we compare/format in UTC to avoid timezone drift, matching the API convention.
 */

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Local YYYY-MM-DD for an input date (used as API payload / input default). */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

/** "Mercredi 14 juin" from an ISO date. */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${capitalize(DAYS[d.getUTCDay()])} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sam 15 juin · 20:00" from an ISO datetime (event). */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = capitalize(DAYS[d.getDay()]).slice(0, 3);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${day} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${time}`;
}

/** "14 – 21 juin 2026" or "14 juin 2026" when same day. */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  if (s.getTime() === e.getTime()) {
    return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  if (sameMonth) {
    return `${s.getUTCDate()} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
  }
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
}

export function monthLabel(year: number, month: number): string {
  return `${capitalize(MONTHS[month])} ${year}`;
}

/** A presence covers `day` if startDate ≤ day ≤ endDate (all at UTC midnight). */
export function coversDay(startIso: string, endIso: string, dayUtcMidnight: number): boolean {
  return new Date(startIso).getTime() <= dayUtcMidnight && dayUtcMidnight <= new Date(endIso).getTime();
}

export function utcMidnight(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
