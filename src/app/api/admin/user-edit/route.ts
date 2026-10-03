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
} from "@/lib/admin/user-edit";

/**
 * POST /api/admin/user-edit — the E2 actions (`P2-ALL-E796`).
 *
 * ⚠⚠ ONE ROUTE, ONE GUARD, before the body is read.
 * ⚠⚠⚠ **THE CONFIRMATION IS PASSED THROUGH, NOT ASSUMED.** Lock and deactivate
 * lock a real person out of their own account, and the library refuses without
 * it — a disabled button is not a guarantee.
 */
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

  /** ⚠ The origin for the links the senders build — taken from the request, not
   *  from a constant, so a preview deploy mails its own URLs. */
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
        await markEmailVerified(gate, personId);
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
