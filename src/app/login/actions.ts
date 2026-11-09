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
import { clientIp, throttleBlocked, throttleHit, TOO_MANY } from "@/lib/server/throttle";

const GENERIC = "Алдаа гарлаа. Дахин оролдоно уу";
const PHONE_ERROR = "8 оронтой утасны дугаар оруулна уу";

// Per IP. Generous: a whole school shares one Wi-Fi address.
const CHECK = { max: 40, seconds: 600 };
const SIGNUP = { max: 20, seconds: 600 };
const FAIL = { max: 20, seconds: 900 };

/** Step 1: is this number registered? (Never says whose it is.) */
export async function checkPhone(raw: string): Promise<{ registered: boolean } | { error: string }> {
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
  const phone = normalizePhone(rawPhone);
  const pin = String(rawPin ?? "");
  if (!isValidPhone(phone) || !/^\d{4}$/.test(pin)) return { error: "PIN буруу" };
  try {
    const failKey = `fail:${await clientIp()}`;
    if (await throttleBlocked(failKey, FAIL.max)) return { error: TOO_MANY };

    const acc = await findByPhone(phone);
    if (!acc) {
      await throttleHit(failKey, FAIL.max, FAIL.seconds);
      return { error: "Бүртгэлгүй дугаар" };
    }
    // Reserve the try first, so parallel guesses can't skip the limit.
    if (!(await reserveTry(acc.id))) {
      return { error: lockedMessage((await lockState(acc.id)).lockedMinutes ?? 15) };
    }
    const check = await verifyPin(pin, acc.pin_hash);
    if (!check.ok) {
      await throttleHit(failKey, FAIL.max, FAIL.seconds);
      return { error: await wrongPinMessage(acc.id) };
    }
    if (!acc.active) return { error: "Таны эрх хаагдсан. Админд хандана уу" };

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
  const phone = normalizePhone(rawPhone);
  const name = String(rawName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const pin = String(rawPin ?? "");
  if (!isValidPhone(phone)) return { error: PHONE_ERROR };
  if (name.length < 2) return { error: "Нэрээ оруулна уу" };
  const problem = pinProblem(pin, phone);
  if (problem) return { error: problem };
  try {
    if (!(await throttleHit(`signup:${await clientIp()}`, SIGNUP.max, SIGNUP.seconds))) return { error: TOO_MANY };
    const res = await createAccount(phone, name, pin);
    if ("taken" in res) return { error: "Энэ дугаар бүртгэлтэй байна" };
    await createSession(res.id);
  } catch (e) {
    console.error("signUp:", (e as Error).message);
    return { error: GENERIC };
  }
  redirect(safeNext(rawNext));
}
