import "server-only";
import { headers } from "next/headers";
import { db } from "./supabase";

/** The visitor's IP: the first x-forwarded-for address (set by Vercel). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const first = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || h.get("x-real-ip") || "unknown";
}

/**
 * Count one hit against `key`. Returns false once it goes over `max`
 * within `seconds`. Atomic in the database (teacher_throttle_hit), so
 * parallel requests cannot slip past. Fails closed.
 */
export async function throttleHit(key: string, max: number, seconds: number): Promise<boolean> {
  const { data, error } = await db().rpc("teacher_throttle_hit", { p_key: key, p_max: max, p_seconds: seconds });
  if (error) {
    console.error("teacher_throttle_hit failed:", error.message);
    return false;
  }
  return data === true;
}

/** Whether `key` is already at `max` (counts nothing). */
export async function throttleBlocked(key: string, max: number): Promise<boolean> {
  const { data, error } = await db().from("teacher_throttle").select("hits, window_end").eq("key", key).maybeSingle();
  if (error) {
    console.error("teacher_throttle read failed:", error.message);
    return true;
  }
  return !!data && data.hits >= max && new Date(data.window_end).getTime() > Date.now();
}

export const TOO_MANY = "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу";
