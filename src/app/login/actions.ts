"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/next-path";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { pinProblem } from "@/lib/pin-rules";
import {
  createAccount,
  findByPhone,
  lockState,
  lockedMessage,
  markSignedIn,
  reserveTry,
  wrongPinMessage,
} from "@/lib/server/accounts";
import { verifyPin } from "@/lib/server/pin-hash";
import { createSession } from "@/lib/server/session";
import { getT } from "@/lib/server/lang";
import { clientIp, throttleBlocked, throttleHit, TOO_MANY, TOO_MANY_EN } from "@/lib/server/throttle";

/** The messages here, in the visitor's language. */
async function texts() {
  const t = await getT();
  return {
    t,
    lang: t("mn", "en") as "mn" | "en",
    GENERIC: t("Алдаа гарлаа. Дахин оролдоно уу", "Something went wrong. Please try again"),
    PHONE_ERROR: t("8 оронтой утасны дугаар оруулна уу", "Enter an 8-digit phone number"),
    TOO_MANY: t(TOO_MANY, TOO_MANY_EN),
  };
}

// Per IP. Generous: a whole school shares one Wi-Fi address.
const CHECK = { max: 40, seconds: 600 };
const SIGNUP = { max: 20, seconds: 600 };
const FAIL = { max: 20, seconds: 900 };

/** Step 1: is this number registered? (Never says whose it is.) */
export async function checkPhone(raw: string): Promise<{ registered: boolean } | { error: string }> {
  const { GENERIC, PHONE_ERROR, TOO_MANY } = await texts();
  const phone = normalizePhone(raw);
  if (!isValidPhone(phone)) return { error: PHONE_ERROR };
  try {
    if (!(await throttleHit(`check:${await clientIp()}`, CHECK.max, CHECK.seconds))) return { error: TOO_MANY };
    return { registered: !!(await findByPhone(phone)) };
  } catch (e) {
    console.error("checkPhone:", (e as Error).message);
    return { error: GENERIC };
  }
}

export async function signIn(rawPhone: string, rawPin: string, rawNext?: string): Promise<{ error: string }> {
  const { t, lang, GENERIC, TOO_MANY } = await texts();
  const phone = normalizePhone(rawPhone);
  const pin = String(rawPin ?? "");
  if (!isValidPhone(phone) || !/^\d{4}$/.test(pin)) return { error: t("PIN буруу", "Wrong PIN") };
  try {
    const failKey = `fail:${await clientIp()}`;
    if (await throttleBlocked(failKey, FAIL.max)) return { error: TOO_MANY };

    const acc = await findByPhone(phone);
    if (!acc) {
      await throttleHit(failKey, FAIL.max, FAIL.seconds);
      return { error: t("Бүртгэлгүй дугаар", "This number isn't registered") };
    }
    // Reserve the try first, so parallel guesses can't skip the limit.
    if (!(await reserveTry(acc.id))) {
      return { error: lockedMessage((await lockState(acc.id)).lockedMinutes ?? 15, lang) };
    }
    const check = await verifyPin(pin, acc.pin_hash);
    if (!check.ok) {
      await throttleHit(failKey, FAIL.max, FAIL.seconds);
      return { error: await wrongPinMessage(acc.id, lang) };
    }
    if (!acc.active) return { error: t("Таны эрх хаагдсан. Админд хандана уу", "Your account is blocked. Please contact the admin") };

    await markSignedIn(acc.id, pin, check.rehash);
    await createSession(acc.id);
  } catch (e) {
    console.error("signIn:", (e as Error).message);
    return { error: GENERIC };
  }
  redirect(safeNext(rawNext));
}

export async function signUp(
  rawPhone: string,
  rawName: string,
  rawPin: string,
  rawNext?: string,
): Promise<{ error: string }> {
  const { t, lang, GENERIC, PHONE_ERROR, TOO_MANY } = await texts();
  const phone = normalizePhone(rawPhone);
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const pin = String(rawPin ?? "");
  if (!isValidPhone(phone)) return { error: PHONE_ERROR };
  if (name.length < 2) return { error: t("Нэрээ оруулна уу", "Enter your name") };
  const problem = pinProblem(pin, phone, lang);
  if (problem) return { error: problem };
  try {
    if (!(await throttleHit(`signup:${await clientIp()}`, SIGNUP.max, SIGNUP.seconds))) return { error: TOO_MANY };
    const res = await createAccount(phone, name, pin);
    if ("taken" in res) return { error: t("Энэ дугаар бүртгэлтэй байна", "This number is already registered") };
    await createSession(res.id);
  } catch (e) {
    console.error("signUp:", (e as Error).message);
    return { error: GENERIC };
  }
  redirect(safeNext(rawNext));
}
