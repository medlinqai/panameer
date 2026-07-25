import { randomInt, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSms, toE164, maskPhone } from "@/lib/sms";

/**
 * Phone verification via SMS (brief_P / E019) — replaces the stub left by
 * brief_E.
 *
 * Security shape is deliberately the same as email verification (brief_E):
 * we store only a SHA-256 HASH of the 6-digit code, issuing a new code
 * invalidates prior unconsumed ones, codes expire, and wrong guesses are
 * capped so a 6-digit space can't be brute-forced.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
/** Minimum gap between sends, so "Send Code" can't be used to spam a number. */
const RESEND_COOLDOWN_MS = 30 * 1000;

export class PhoneVerificationError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_PHONE"
      | "COOLDOWN"
      | "NO_CHALLENGE"
      | "EXPIRED"
      | "TOO_MANY_ATTEMPTS"
      | "WRONG_CODE"
      | "SEND_FAILED"
  ) {
    super(message);
    this.name = "PhoneVerificationError";
  }
}

const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

/**
 * Issue a code to `rawPhone` for this person and send it.
 * Stores the phone on the Person and CLEARS any prior verification, so
 * `phone_verified_at` always describes the number currently on file.
 */
export async function startPhoneVerification(
  personId: string,
  rawPhone: string
): Promise<{ sent: boolean; phone: string; masked: string; devCode?: string }> {
  const phone = toE164(rawPhone);
  if (!phone) {
    throw new PhoneVerificationError(
      "That doesn't look like a valid phone number.",
      "INVALID_PHONE"
    );
  }

  const recent = await prisma.phoneVerification.findFirst({
    where: { person_id: personId, phone, consumed_at: null },
    orderBy: { created_at: "desc" },
  });
  if (recent && Date.now() - recent.created_at.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - recent.created_at.getTime())) / 1000
    );
    throw new PhoneVerificationError(
      `Please wait ${wait}s before requesting another code.`,
      "COOLDOWN"
    );
  }

  // 6 digits, cryptographically random, leading zeros preserved.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await prisma.$transaction([
    // Issuing a new code invalidates every prior unconsumed challenge.
    prisma.phoneVerification.updateMany({
      where: { person_id: personId, consumed_at: null },
      data: { consumed_at: new Date() },
    }),
    prisma.phoneVerification.create({
      data: {
        person_id: personId,
        phone,
        code_hash: hashCode(code),
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
    // Changing the number always drops its verified status.
    prisma.person.update({
      where: { id: personId },
      data: { phone, phone_verified_at: null },
    }),
  ]);

  let sent = false;
  let devCode: string | undefined;
  try {
    const res = await sendSms(
      phone,
      `${code} is your Panameer verification code. It expires in 10 minutes.`
    );
    sent = res.sent;
    if (!res.sent) devCode = code; // dev fallback — no credentials configured
  } catch (e) {
    console.error("[phone] send failed:", e);
    throw new PhoneVerificationError(
      "We couldn't send the code. Check the number and try again.",
      "SEND_FAILED"
    );
  }

  return { sent, phone, masked: maskPhone(phone), devCode };
}

/** Check a submitted code and, on success, stamp `phone_verified_at`. */
export async function confirmPhoneVerification(
  personId: string,
  rawCode: string
): Promise<{ ok: true; phone: string }> {
  const code = (rawCode ?? "").replace(/\D/g, "");

  const challenge = await prisma.phoneVerification.findFirst({
    where: { person_id: personId, consumed_at: null },
    orderBy: { created_at: "desc" },
  });
  if (!challenge) {
    throw new PhoneVerificationError(
      "Request a code first.",
      "NO_CHALLENGE"
    );
  }
  if (challenge.expires_at.getTime() < Date.now()) {
    throw new PhoneVerificationError(
      "That code has expired. Send yourself a new one.",
      "EXPIRED"
    );
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw new PhoneVerificationError(
      "Too many incorrect attempts. Send yourself a new code.",
      "TOO_MANY_ATTEMPTS"
    );
  }

  if (hashCode(code) !== challenge.code_hash) {
    await prisma.phoneVerification.update({
      where: { id: challenge.id },
      data: { attempts: challenge.attempts + 1 },
    });
    const left = MAX_ATTEMPTS - (challenge.attempts + 1);
    throw new PhoneVerificationError(
      left > 0
        ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.`
        : "That code isn't right. Send yourself a new code.",
      "WRONG_CODE"
    );
  }

  await prisma.$transaction([
    prisma.phoneVerification.update({
      where: { id: challenge.id },
      data: { consumed_at: new Date() },
    }),
    prisma.person.update({
      where: { id: personId },
      // Stamp against the number the CODE was sent to, not whatever is in the
      // form now — otherwise editing the field mid-challenge would verify a
      // number that never received a code.
      data: { phone: challenge.phone, phone_verified_at: new Date() },
    }),
  ]);

  return { ok: true, phone: challenge.phone };
}
