export const PIN_LENGTH = 4;

// Among the most-used 4-digit PINs, beyond the patterns caught below.
const COMMON = new Set(["1212", "2580", "1004", "2000", "2001", "6969", "1122", "1313", "1010", "0852"]);

/**
 * Why this PIN is too easy to guess, or null when it's fine. Runs on the
 * phone (to warn early) and again on the server (which decides).
 */
export function pinProblem(pin: string, phone?: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "4 оронтой тоо оруулна уу";
  const easy = "Амархан PIN байна. Өөр PIN сонгоно уу";
  if (/^(\d)\1{3}$/.test(pin)) return easy;
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((v, i) => (v - d[i] + 10) % 10);
  if (steps.every((s) => s === 1) || steps.every((s) => s === 9)) return easy;
  if (COMMON.has(pin)) return easy;
  if (phone && (phone.startsWith(pin) || phone.endsWith(pin))) return "Утасны дугаараасаа өөр PIN сонгоно уу";
  return null;
}
