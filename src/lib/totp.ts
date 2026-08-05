import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * RFC 6238 time-based one-time passwords (J2.4 WS-H / E018).
 *
 * WRITTEN OUT RATHER THAN DEPENDED ON, because it is forty lines of HMAC and a
 * counter, and a 2FA dependency is a supply-chain surface on the one part of
 * the product whose whole job is being trustworthy.
 *
 * REAL, OR ABSENT. Half-built two-step verification is worse than none: it
 * teaches somebody they are protected when they are not, and they choose a
 * weaker password on the strength of it. So this verifies properly — 30-second
 * steps, SHA-1 per the spec (which is what every authenticator app implements),
 * a ±1 step window for clock drift, and a constant-time comparison so the
 * check itself doesn't leak the answer a digit at a time.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
/** One step either side. Wider is a real weakening; narrower fails honest users. */
const DRIFT_STEPS = 1;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A fresh 160-bit secret, base32 for the authenticator app. */
export function generateSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function codeAt(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/**
 * Is `code` valid for `secret` right now?
 *
 * Constant-time per candidate. Comparing with `===` would return faster on an
 * early mismatch, which over enough attempts is a side channel on a six-digit
 * secret — the exact place where that actually matters.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const trimmed = code.replace(/\D/g, "");
  if (trimmed.length !== DIGITS) return false;

  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  const given = Buffer.from(trimmed);

  let ok = false;
  for (let d = -DRIFT_STEPS; d <= DRIFT_STEPS; d++) {
    const expected = Buffer.from(codeAt(secret, counter + d));
    // No early return: run every candidate so the loop's duration doesn't
    // report WHICH step matched.
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      ok = true;
    }
  }
  return ok;
}

/**
 * The `otpauth://` URI an authenticator app scans.
 *
 * Rendered as text as well as a QR: a provider setting this up on the same
 * device they are reading it on cannot scan their own screen, and "copy this
 * string into your app" is the escape hatch every authenticator supports.
 */
export function otpauthUri(secret: string, account: string): string {
  const issuer = encodeURIComponent("Panameer");
  const label = encodeURIComponent(account);
  return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
