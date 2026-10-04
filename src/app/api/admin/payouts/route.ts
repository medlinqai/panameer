import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { MoneyError, recordPayout } from "@/lib/admin-money";

export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = await req.json().catch(() => null);
  if (!b?.settlementId) return NextResponse.json({ ok: false, error: "Which payment request?" }, { status: 400 });
  try {
    const r = await recordPayout({
      settlementId: String(b.settlementId),
      method: String(b.method ?? ""),
      externalRef: b.externalRef ?? null,
      paidAt: String(b.paidAt ?? ""),
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof MoneyError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: 409 });
    console.error("[admin/payouts] record failed:", e);
    return NextResponse.json({ ok: false, error: "Could not record that payout" }, { status: 500 });
  }
}
