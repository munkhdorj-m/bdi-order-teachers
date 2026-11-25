import type { T } from "@/lib/i18n";

/** «1 багц + 2ш» / «1 pack + 2 pcs». */
export function packText(parts: { packs: number; rest: number }, t: T): string {
  const packs = t(`${parts.packs} багц`, `${parts.packs} ${parts.packs === 1 ? "pack" : "packs"}`);
  return parts.rest ? `${packs} + ${parts.rest}${t("ш", parts.rest === 1 ? " pc" : " pcs")}` : packs;
}
