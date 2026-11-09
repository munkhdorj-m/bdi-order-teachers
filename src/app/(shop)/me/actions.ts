"use server";

import { redirect } from "next/navigation";
import { pinProblem } from "@/lib/pin-rules";
import { findById, lockState, lockedMessage, reserveTry, setPin, wrongPinMessage } from "@/lib/server/accounts";
import { verifyPin } from "@/lib/server/pin-hash";
import { destroyOtherSessions, destroySession, requireTeacher } from "@/lib/server/session";

export async function changePin(
  current: string,
  next: string,
): Promise<{ ok: true } | { ok: false; error: string; step: "current" | "new" }> {
  const me = await requireTeacher();
  const cur = String(current ?? "");
  const pin = String(next ?? "");
  if (!/^\d{4}$/.test(cur)) return { ok: false, error: "PIN буруу", step: "current" };
  const problem = pinProblem(pin, me.phone);
  if (problem) return { ok: false, error: problem, step: "new" };
  if (pin === cur) return { ok: false, error: "Шинэ PIN өөр байх ёстой", step: "new" };
  try {
    const acc = await findById(me.id);
    if (!acc) return { ok: false, error: "Алдаа гарлаа", step: "current" };
    if (!(await reserveTry(me.id))) {
      return { ok: false, error: lockedMessage((await lockState(me.id)).lockedMinutes ?? 15), step: "current" };
    }
    const check = await verifyPin(cur, acc.pin_hash);
    if (!check.ok) return { ok: false, error: await wrongPinMessage(me.id), step: "current" };
    await setPin(me.id, pin);
    // Anyone else signed in with the old PIN is signed out.
    await destroyOtherSessions(me.id);
    return { ok: true };
  } catch (e) {
    console.error("changePin:", (e as Error).message);
    return { ok: false, error: "Алдаа гарлаа. Дахин оролдоно уу", step: "current" };
  }
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
