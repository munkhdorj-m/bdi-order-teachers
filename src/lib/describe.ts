/**
 * Turns a product's free-text description into parts that are easy to scan:
 *   summary   the first sentence: what the product is
 *   features  the other sentences, and any line starting with - • * ✓ or "1."
 *   extras    short lines such as "120мл" (shown as small tags)
 * Only reorganises the text; it never adds anything that isn't written.
 */
export type Described = { summary: string | null; features: string[]; extras: string[] };

const BULLET = /^(?:[-–—•*✓✔·]|\d{1,2}[.)])\s*/;
// A sentence ends at . ! ? followed by a space and a capital letter or digit.
const SENTENCE_END = /(?<=[.!?])\s+(?=[A-ZА-ЯЁӨҮ0-9])/;
const SHORT = 24;

export function describe(text: string | null | undefined): Described {
  const out: Described = { summary: null, features: [], extras: [] };
  if (!text) return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "").trim();
      if (item) out.features.push(item);
    } else if (line.length <= SHORT && !/[.!?]$/.test(line)) {
      out.extras.push(line);
    } else {
      for (const sentence of line.split(SENTENCE_END).map((s) => s.trim()).filter(Boolean)) {
        if (!out.summary) out.summary = sentence;
        else out.features.push(sentence);
      }
    }
  }
  return out;
}
