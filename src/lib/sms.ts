
export type SmsResult = { sent: boolean; devMessage?: string };

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

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
