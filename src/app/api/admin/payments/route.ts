import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { MoneyError, recordPayment } from "@/lib/admin-money";

export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  try {
    const r = await recordPayment({
      pAccountId: String(b.pAccountId ?? ""),
      amountCents: Number(b.amountCents),
      receivedAt: String(b.receivedAt ?? ""),
      externalRef: b.externalRef ?? null,
      allocations: Array.isArray(b.allocations)
        ? b.allocations.map((a: { settlementId: unknown; amountCents: unknown }) => ({ settlementId: String(a.settlementId), amountCents: Number(a.amountCents) }))
        : [],
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof MoneyError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: 409 });
    console.error("[admin/payments] record failed:", e);
    return NextResponse.json({ ok: false, error: "Could not record that payment" }, { status: 500 });
  }
}
