import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

export async function POST() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      user: { select: { email: true } },
    },
  });
  if (!person?.user?.email) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_recipient" });
  }

  const alreadySent = await prisma.notification.findUnique({
    where: {
      person_id_dedupe_key: { person_id: person.id, dedupe_key: DEDUPE_KEY },
    },
    select: { id: true },
  });
  if (alreadySent) {
    return NextResponse.json({ ok: true, sent: false, reason: "already_sent" });
  }

  await notify({
    event: "account.finish_later",
    personId: person.id,
    dedupeKey: DEDUPE_KEY,
  });

  return NextResponse.json({ ok: true, notified: true });
}

const DEDUPE_KEY = "account.finish_later";
