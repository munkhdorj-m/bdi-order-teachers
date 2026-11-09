/** IBAN without spaces, in capitals: "mn12 0005 ..." → "MN120005...". */
export function compactIban(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** In groups of four, easier to read: "MN12 0005 0050 8533 2645". */
export function formatIban(raw: string): string {
  return compactIban(raw).replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * The international IBAN check (mod 97), so a mistyped digit is caught
 * before teachers see it: move the first four characters to the end, turn
 * letters into numbers (A = 10 … Z = 35), and the remainder must be 1.
 */
export function isValidIban(raw: string): boolean {
  const s = compactIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(s)) return false;
  let rem = 0;
  for (const ch of s.slice(4) + s.slice(0, 4)) {
    const digits = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}
