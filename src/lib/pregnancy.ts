// Gestational age from the due date (280 days = 40w0d). Pure; `today` is a "YYYY-MM-DD" care date.
export interface PregnancyWeek {
  weeks: number;
  days: number;
  daysToGo: number;
}

const DAY_MS = 86_400_000;

function utcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function pregnancyWeek(dueDate: string | null | undefined, today: string): PregnancyWeek | null {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const daysToGo = Math.round((utcDay(dueDate) - utcDay(today)) / DAY_MS);
  const elapsed = 280 - daysToGo;
  if (elapsed < 0 || elapsed > 300) return null;
  return { weeks: Math.floor(elapsed / 7), days: elapsed % 7, daysToGo };
}
