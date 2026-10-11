import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { addToCart, CartError, placeOrder, removeLine, setQuantity } from "@/lib/cart";

const BODY = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), productId: z.string().uuid(), quantity: z.number().int().min(1).max(99).optional() }),
  z.object({ action: z.literal("qty"), lineId: z.string().uuid(), quantity: z.number().int() }),
  z.object({ action: z.literal("remove"), lineId: z.string().uuid() }),
  z.object({ action: z.literal("place") }),
]);

// SH-E002/E003: the signed-in buyer's own cart (owner-scoped in the lib).
export async function POST(req: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const d = b.data;
    if (d.action === "add") await addToCart(viewer, d.productId, d.quantity);
    else if (d.action === "qty") await setQuantity(viewer, d.lineId, d.quantity);
    else if (d.action === "remove") await removeLine(viewer, d.lineId);
    else return NextResponse.json({ ok: true, orders: await placeOrder(viewer) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CartError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    throw e;
  }
}
