/**
 * Two languages: Mongolian (default) and English. Text is written in place
 * as a pair, t("Сагс", "Cart"), so the Mongolian stays readable in the code.
 * The choice lives in a cookie, so the server renders the right language.
 */
export type Lang = "mn" | "en";

export const LANG_COOKIE = "bdi-lang";

export type T = (mn: string, en: string) => string;

export function isLang(v: unknown): v is Lang {
  return v === "mn" || v === "en";
}

export function makeT(lang: Lang): T {
  return (mn, en) => (lang === "en" ? en : mn);
}

/** BDI's unit words («ш», «уут»…) in English; unknown ones stay as they are. */
const UNITS_EN: Record<string, string> = {
  ш: "pc",
  ширхэг: "pc",
  уут: "bag",
  хайрцаг: "box",
  багц: "pack",
  кг: "kg",
  л: "L",
};

export function unitLabel(unit: string, lang: Lang): string {
  return lang === "en" ? (UNITS_EN[unit.trim().toLowerCase()] ?? unit) : unit;
}
