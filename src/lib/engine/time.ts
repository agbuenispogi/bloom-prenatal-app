import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { CareDate, HHmm } from "./types";

const MINUTE = 60_000;

export function parseHHmm(value: HHmm): number {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) throw new Error(`Invalid time "${value}"`);
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) throw new Error(`Invalid time "${value}"`);
  return h * 60 + m;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MINUTE);
}

export function addDays(date: CareDate, days: number): CareDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: CareDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

// The care date an instant belongs to: before `dayStart` (04:00) it still counts as the previous day.
export function careDateOf(instant: Date, tz: string, dayStart: HHmm): CareDate {
  const local = formatInTimeZone(instant, tz, "yyyy-MM-dd HH:mm");
  const [date, time] = local.split(" ") as [CareDate, HHmm];
  return parseHHmm(time) < parseHHmm(dayStart) ? addDays(date, -1) : date;
}

// The instant of a wall-clock time within a care day. Times before `dayStart` (e.g. 01:00) and "24:00"
// fall on the next calendar day, because the care day runs past midnight.
export function wallTime(careDate: CareDate, time: HHmm, tz: string, dayStart: HHmm): Date {
  let minutes = parseHHmm(time);
  let date = careDate;
  if (minutes === 24 * 60) {
    minutes = 0;
    date = addDays(careDate, 1);
  } else if (minutes < parseHHmm(dayStart)) {
    date = addDays(careDate, 1);
  }
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${date}T${hh}:${mm}:00`, tz);
}

export function careDayBounds(careDate: CareDate, tz: string, dayStart: HHmm): { start: Date; end: Date } {
  const start = wallTime(careDate, dayStart, tz, dayStart);
  const end = wallTime(addDays(careDate, 1), dayStart, tz, dayStart);
  return { start, end };
}

export function formatClock(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, "h:mm a");
}
