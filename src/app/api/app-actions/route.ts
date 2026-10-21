import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { apiError } from "@/lib/api-errors";
import { WorkRequestError } from "@/lib/work-request";
import { SourcingError } from "@/lib/sourcing";
import { EstimateError, decideEstimate } from "@/lib/estimates";
import { counterBack, dismissMessage, extendOffer, hideProduct, shortlistEstimate } from "@/lib/app-actions";

// SE-E001–E004: Overview row actions for Shop and Estimate (owner-scoped in the lib).
type Body = { action?: string; offerId?: string; amountCents?: number; hours?: number; productId?: string; estimateId?: string; messageId?: string };

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as Body;
  try {
    switch (b.action) {
      case "offerCounterBack": return NextResponse.json({ ok: true, ...(await counterBack(gate, String(b.offerId), Number(b.amountCents))) });
      case "offerExtend": await extendOffer(gate, String(b.offerId), Number(b.hours)); break;
      case "hideProduct": await hideProduct(gate, String(b.productId)); break;
      case "estimateShortlist": await shortlistEstimate(gate, String(b.estimateId)); break;
      case "estimateDecline": await decideEstimate(gate, String(b.estimateId), "DECLINE"); break;
      case "dismissMessage": await dismissMessage(gate, String(b.messageId)); break;
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "app-actions", [WorkRequestError, SourcingError, EstimateError]);
  }
}
