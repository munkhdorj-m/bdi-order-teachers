/**
 * Calendar days in Ulaanbaatar. Mongolia is UTC+8 all year (no daylight
 * saving since 2017), so a fixed offset is exact. Day keys are "YYYY-MM-DD".
 */
const OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Ulaanbaatar day a moment falls on. */
export function ubDayKey(t: Date | string | number): string {
  return new Date(new Date(t).getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The moment a Ulaanbaatar day starts, as an ISO string (for queries). */
export function ubDayStartIso(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - OFFSET_MS).toISOString();
}

export function isDayKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export function shiftDay(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The last `days` Ulaanbaatar days, oldest first, ending today. */
export function lastUbDays(days: number, now: Date = new Date()): string[] {
  const today = ubDayKey(now);
  return Array.from({ length: days }, (_, i) => shiftDay(today, i - (days - 1)));
}

/** "2026-11-08" → "11.08" */
export function dayLabel(key: string): string {
  return `${key.slice(5, 7)}.${key.slice(8, 10)}`;
}
