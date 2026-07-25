/**
 * SMS sending (brief_P / E019).
 *
 * Mirrors the Resend pattern (`src/lib/verification.ts`): when credentials are
 * configured we really send; when they are not, we LOG the message and return
 * it as a `devCode` so the whole phone-verification flow stays walkable locally
 * with no account, no spend, and no code changes.
 *
 * Provider is Twilio, called over its plain REST API with `fetch` — no SDK, so
 * nothing is added to the bundle and there is no client to construct eagerly
 * (see the lazy-client pitfall). Setting TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * and TWILIO_FROM_NUMBER flips this to real delivery.
 */

export type SmsResult = { sent: boolean; devMessage?: string };

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

/**
 * Normalize a typed phone number to E.164 as best we can.
 * Returns null when it clearly isn't a phone number.
 *
 * A bare 10-digit number is assumed to be US/Canada (+1) — the finish page
 * defaults Country to the United States (E019). Anything else must be typed
 * with its own country code.
 */
export function toE164(raw: string, defaultCountryCode = "1"): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (hadPlus) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** Mask for display / logs: +1 555 010 4477 → +1 ••• ••• 4477. */
export function maskPhone(e164: string): string {
  if (e164.length < 4) return "•••";
  return `${e164.slice(0, 2)} ••• ••• ${e164.slice(-4)}`;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) {
    console.warn(
      `[sms] TWILIO_* not set — dev fallback. Message for ${to}:\n${body}`
    );
    return { sent: false, devMessage: body };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[sms] Twilio send failed (${res.status}):`, detail);
    throw new Error("Could not send the verification code.");
  }
  return { sent: true };
}
