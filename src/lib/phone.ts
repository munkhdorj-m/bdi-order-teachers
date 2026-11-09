/** Digits only; drops a leading +976. */
export function normalizePhone(input: string): string {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("976")) d = d.slice(3);
  return d;
}

/** A Mongolian 8-digit number. */
export function isValidPhone(d: string): boolean {
  return /^[2-9]\d{7}$/.test(d);
}
