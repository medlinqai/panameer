import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { suppress, verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { normalizeEmail } from "@/lib/normalizeEmail";

const Body = z.object({
  email: z.string().email(),
  category: z.string().nullable(),
  token: z.string().min(1),
  scope: z.enum(["category", "all"]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { email, category, token, scope } = parsed.data;

  if (!verifyUnsubscribeToken(email, category, token)) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 403 });
  }

  await suppress(email, scope === "all" ? null : category, "unsubscribe_link");

  const person = await prisma.person.findFirst({
    where: { user: { is: { email: normalizeEmail(email) } } },
    select: { id: true },
  });
  if (person) {
    const cats = scope === "all" || !category ? null : category;
    if (cats) {
      await prisma.notificationPreference.updateMany({
        where: { person_id: person.id, category: cats },
        data: { email: false },
      });
    } else {
      await prisma.notificationPreference.updateMany({
        where: { person_id: person.id },
        data: { email: false },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
