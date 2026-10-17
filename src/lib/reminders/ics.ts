// A one-event iCalendar file with an alarm at the event time, so she can add a native phone alarm. Pure.
export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  durationMin?: number;
  url?: string;
  now: Date;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545 folds lines longer than 75 octets.
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

function eventLines(e: IcsEvent): string[] {
  const end = new Date(e.start.getTime() + (e.durationMin ?? 15) * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(e.now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    `DESCRIPTION:${escape(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(e.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];
}

const HEADER = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bloom//Prenatal companion//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];

export function buildIcs(e: IcsEvent): string {
  return [...HEADER, ...eventLines(e), "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}

// A subscribable calendar (the phone's Calendar app re-fetches it). Each event rings a native alert on time.
export function buildCalendar(name: string, events: IcsEvent[]): string {
  const lines = [
    ...HEADER,
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Asia/Manila",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
