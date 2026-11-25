import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, makeT, type Lang, type T } from "@/lib/i18n";

/** The visitor's language (cookie), Mongolian by default. */
export const getLang = cache(async (): Promise<Lang> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "mn";
});

export async function getT(): Promise<T> {
  return makeT(await getLang());
}
