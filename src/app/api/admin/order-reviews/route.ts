import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { adminReviews, hideReviewComment, ReviewError } from "@/lib/order-reviews";

// OR-E005: Admin › Users / Companies — review averages and counts; hide one comment with a reason (audited).
export async function GET(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const u = new URL(request.url);
  const personId = u.searchParams.get("personId") ?? undefined, companyId = u.searchParams.get("companyId") ?? undefined;
  if (!personId && !companyId) return NextResponse.json({ error: "personId or companyId" }, { status: 400 });
  return NextResponse.json(await adminReviews({ personId, companyId }));
}

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as { reviewId?: string; reason?: string };
  try {
    await hideReviewComment(gate, String(b.reviewId ?? ""), String(b.reason ?? ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ReviewError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
