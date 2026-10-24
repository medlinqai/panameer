import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";
import { createFromSetup, SetupError, type SetupInput } from "@/lib/erp/setup-create";

// ES-E004: Create My Company — only from a live setup session (the punch-out cookie); never a shopping session.
export async function POST(req: Request) {
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value);
  if (!s || s.connection.kind !== "SETUP") return NextResponse.json({ error: "Your setup session ended — punch in again from your ERP." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<SetupInput>;
  const input: SetupInput = { companyName: String(b.companyName ?? ""), line1: String(b.line1 ?? ""), city: String(b.city ?? ""), state: String(b.state ?? ""), postalCode: String(b.postalCode ?? ""), country: String(b.country ?? ""), firstName: String(b.firstName ?? ""), lastName: String(b.lastName ?? ""), email: String(b.email ?? ""), erpAdminEmail: String(b.erpAdminEmail ?? ""), acceptTerms: b.acceptTerms === true };
  try {
    const r = await createFromSetup(s, input);
    if (r.existing) return NextResponse.json({ existing: true, companyName: r.companyName });
    const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(req.url).origin;
    const { afterSetup } = await import("@/lib/erp/self-onboard-notify");
    await afterSetup({ ...r, email: input.email.trim().toLowerCase(), erpAdminEmail: input.erpAdminEmail.trim().toLowerCase(), firstName: input.firstName.trim() }, origin).catch((e) => console.error("[erp setup] notices failed:", e));
    return NextResponse.json({ existing: false, values: r.values });
  } catch (e) {
    if (e instanceof SetupError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[erp setup] create failed:", e);
    return NextResponse.json({ error: "Couldn't create your company — try again." }, { status: 500 });
  }
}
