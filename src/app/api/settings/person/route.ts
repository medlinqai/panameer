import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";

const BODY = z.object({
  firstName: z.string().trim().min(1, "A first name is required.").max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  title: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
});

/**
 * PATCH /api/settings/person — edit your own name, title and phone (WS7/E004).
 *
 * OWNER-SCOPED BY CONSTRUCTION: the Person is resolved from the session's
 * user_id, and the body carries no id. There is no shape of request that edits
 * somebody else — which matters more here than usual, because the people most
 * likely to call it are the ones who could reach every other record.
 *
 * Exists because "My Profile" was read-only for staff: an admin could see their
 * own name and not change it (E003/E004). The provider settings endpoints write
 * ProviderProfile fields, which a Panameer employee doesn't have.
 */
export async function PATCH(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't valid." },
      { status: 400 }
    );
  }
  const { firstName, lastName, title, phone } = parsed.data;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return NextResponse.json({ error: "No profile for this user" }, { status: 404 });
  }

  await prisma.person.update({
    where: { id: person.id },
    data: {
      first_name: firstName,
      last_name: lastName || "",
      // Empty string means "cleared", which is different from "unchanged" —
      // stored as null so the display fallbacks fire rather than rendering "".
      title: title || null,
      phone: phone || null,
    },
  });

  return NextResponse.json({ ok: true });
}
