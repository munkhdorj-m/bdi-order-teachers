export function formatMnt(n: number): string {
  return new Intl.NumberFormat("mn-MN").format(Math.round(n)) + "₮";
}

/** "99112233" → "9911 2233" */
export function formatPhone(phone: string): string {
  return /^\d{8}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone;
}

const DATE_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "2026.11.08 14:30" in Ulaanbaatar time, the same on server and phone. */
export function formatDateTime(iso: string): string {
  const p = Object.fromEntries(DATE_PARTS.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}
