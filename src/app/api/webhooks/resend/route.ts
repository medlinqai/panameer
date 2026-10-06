import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { suppress } from "@/lib/unsubscribe";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const HANDLED = {
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
} as const;

type HandledType = keyof typeof HANDLED;

export async function POST(request: Request) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not set — refusing");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const payload = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[resend-webhook] missing svix headers — refusing");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = new Resend(env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: secret,
    });
  } catch {
    console.error("[resend-webhook] signature verification FAILED");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const type = event.type as string;
  if (!(type in HANDLED)) {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const status = HANDLED[type as HandledType];
  const data = event.data as {
    email_id: string;
    to: string[];
    bounce?: { type?: string; subType?: string; message?: string };
  };

  const messageId = data.email_id;
  const recipients = (data.to ?? []).map(normalizeEmail).filter(Boolean);
  if (!messageId || recipients.length === 0) {
    console.error(`[resend-webhook] ${type} with no email_id or recipients — ignored`);
    return NextResponse.json({ ok: true, ignored: "malformed" });
  }

  // MATCHED ON (resend_message_id, to_email) — THE PAIR, NOT THE ID.
  const bounceType = data.bounce?.type ?? null;
  const updated = await prisma.sentEmail.updateMany({
    where: { resend_message_id: messageId, to_email: { in: recipients } },
    data: { status, ...(bounceType ? { bounce_type: bounceType } : {}) },
  });

  if (updated.count === 0) {
    // NOT AN ERROR, AND NOT SILENT. A receipt can legitimately be missing: mail
    console.warn(`[resend-webhook] ${type} matched no receipt (${messageId})`);
  }

  // A HARD BOUNCE SUPPRESSES. A SOFT ONE DOES NOT.
  if (type === "email.bounced" && bounceType === "Permanent") {
    for (const email of recipients) await suppress(email, null, "bounce");
  }
  if (type === "email.complained") {
    for (const email of recipients) await suppress(email, null, "complaint");
  }

  return NextResponse.json({ ok: true, type, matched: updated.count });
}
