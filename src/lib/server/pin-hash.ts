import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * PIN hashes: scrypt with a random salt per account.
 *
 *   v1$<p|n>$<salt>$<hash>     (base64url; p = pepper used, n = not)
 *
 * TEACHER_PIN_PEPPER is optional. Because each hash records whether it was
 * peppered, a pepper can be added later: old hashes still verify and get
 * re-hashed with the pepper at the next sign-in. Never change or remove a
 * pepper once set, or peppered PINs stop working.
 */

const KEYLEN = 32;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function pepper(): string | null {
  const p = process.env.TEACHER_PIN_PEPPER;
  return p && p.length > 0 ? p : null;
}

function derive(pin: string, salt: Buffer, withPepper: string | null): Promise<Buffer> {
  const input = withPepper ? createHmac("sha256", withPepper).update(pin).digest() : Buffer.from(pin, "utf8");
  return new Promise((resolve, reject) =>
    scrypt(input, salt, KEYLEN, PARAMS, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const pep = pepper();
  const key = await derive(pin, salt, pep);
  return ["v1", pep ? "p" : "n", salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPin(pin: string, stored: string): Promise<{ ok: boolean; rehash: boolean }> {
  const [v, flag, saltB64, keyB64] = String(stored).split("$");
  if (v !== "v1" || (flag !== "p" && flag !== "n") || !saltB64 || !keyB64) return { ok: false, rehash: false };
  const pep = pepper();
  if (flag === "p" && !pep) {
    console.error("PIN hash needs TEACHER_PIN_PEPPER, which is not set");
    return { ok: false, rehash: false };
  }
  const expected = Buffer.from(keyB64, "base64url");
  const actual = await derive(pin, Buffer.from(saltB64, "base64url"), flag === "p" ? pep : null);
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  return { ok, rehash: ok && flag === "n" && !!pep };
}
