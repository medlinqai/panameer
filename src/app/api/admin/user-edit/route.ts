import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { guardApi } from "@/lib/guard";
import {
  UserEditError,
  markEmailVerified,
  sendPasswordReset,
  setActive,
  setEmail,
  setLocked,
  setName,
  setRoles,
  nudgeFinishProfile,
  addToCompany,
} from "@/lib/admin/user-edit";

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";
  const personId = String(body.personId ?? "");
  if (!personId) return NextResponse.json({ error: "Which person?" }, { status: 400 });

  const h = await headers();
  const origin = h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : null);
  const confirmed = body.confirmed === true;

  try {
    switch (action) {
      case "name":
        await setName(gate, personId, String(body.first ?? ""), String(body.last ?? ""));
        return NextResponse.json({ ok: true });
      case "email":
        return NextResponse.json({ ok: true, ...(await setEmail(gate, personId, String(body.email ?? ""), origin)) });
      case "verify":
        if (!String(body.reason ?? "").trim()) return NextResponse.json({ error: "Give a reason for marking this verified." }, { status: 400 });
        await markEmailVerified(gate, personId, String(body.reason));
        return NextResponse.json({ ok: true });
      case "roles":
        await setRoles(gate, personId, {
          buyer: typeof body.buyer === "boolean" ? body.buyer : undefined,
          provider: typeof body.provider === "boolean" ? body.provider : undefined,
          coordinator: typeof body.coordinator === "boolean" ? body.coordinator : undefined,
        });
        return NextResponse.json({ ok: true });
      case "lock":
        await setLocked(gate, personId, body.locked === true, confirmed);
        return NextResponse.json({ ok: true });
      case "active":
        await setActive(gate, personId, body.active === true, confirmed);
        return NextResponse.json({ ok: true });
      case "nudge":
        return NextResponse.json({ ok: true, ...(await nudgeFinishProfile(gate, personId)) });
      case "add_company":
        await addToCompany(gate, personId, String(body.companyId ?? ""), String(body.reason ?? ""));
        return NextResponse.json({ ok: true });
      case "reset":
        return NextResponse.json({ ok: true, ...(await sendPasswordReset(gate, personId, origin)) });
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof UserEditError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[user-edit] unexpected", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
