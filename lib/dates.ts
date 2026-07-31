const IST = "Asia/Kolkata";

/** Parts of a date/time in IST */
function istParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
  return parts;
}

/** "YYYY-MM" month key for a timestamp, evaluated in IST */
export function monthKeyIST(d: Date): string {
  const p = istParts(d);
  return `${p.year}-${p.month}`;
}

/** Current IST date/time as value for <input type="datetime-local"> */
export function nowISTForInput(): string {
  const p = istParts(new Date());
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/** Current IST date as YYYY-MM-DD */
export function todayIST(): string {
  const p = istParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** Convert a "YYYY-MM-DDTHH:mm" value (meant as IST wall time) to a UTC Date */
export function istInputToDate(value: string): Date {
  return new Date(`${value}:00+05:30`);
}

/** Existing timestamp -> value for <input type="datetime-local"> shown in IST */
export function dateToISTInput(iso: string | Date): string {
  const p = istParts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/**
 * Normalize a DATE column value (string or Date from the driver) to YYYY-MM-DD.
 * The driver parses DATE as midnight in the server's local time zone, so read
 * it back with local getters — using UTC here would shift the day.
 */
export function toYMD(v: string | Date): string {
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  return v.slice(0, 10);
}

/** "12 Jul 2026, 10:30 AM" in IST */
export function formatDateTimeIST(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** "12 Jul 2026" for a plain DATE column value */
export function formatDate(value: string | Date): string {
  const [y, m, d] = toYMD(value).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "July 2026" label for a "YYYY-MM" month key */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** List of month keys around now (previous 12, next 3), newest first */
export function monthOptions(): string[] {
  const now = new Date();
  const p = istParts(now);
  let y = Number(p.year);
  let m = Number(p.month) + 3;
  const out: string[] = [];
  for (let i = 0; i < 16; i++) {
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
  }
  return out;
}
