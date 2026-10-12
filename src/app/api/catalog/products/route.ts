import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { MAX_IMAGES, addProductType, publishCatalogProduct, saveCatalogProduct } from "@/lib/catalog-products";

const Form = z.object({
  title: z.string().max(200), serviceTypeId: z.string().uuid().nullable(), summary: z.string().max(4000),
  images: z.array(z.string().url().max(1000)).max(MAX_IMAGES), pricing: z.enum(["FIXED", "MONTHLY", "HOURLY"]),
  priceCents: z.number().int().min(0).max(1_000_000_000).nullable(), delivery: z.enum(["OFFSITE", "ONSITE", "EITHER"]).nullable(),
  leadTimeDays: z.number().int().min(0).max(365).nullable(), durationWeeks: z.number().int().min(0).max(520).nullable(),
  domainIds: z.array(z.string().uuid()).max(40), skillIds: z.array(z.string().uuid()).max(40), deliverables: z.array(z.string().max(300)).max(20),
  payPlan: z.enum(["ON_DELIVERY", "SPLIT", "MONTHLY_ADVANCE"]),
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: z.string().uuid().nullable(), form: Form, publish: z.boolean() }),
  z.object({ action: z.literal("publish"), id: z.string().uuid() }),
  z.object({ action: z.literal("addType"), name: z.string().trim().min(3).max(60) }),
]);

// MC-E006: My Catalog › Service Products — save (draft or publish) and publish from the list. Owner-scoped in the lib.
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the form and try again" }, { status: 400 });
  try {
    const d = b.data;
    if (d.action === "addType") return NextResponse.json({ ok: true, type: await addProductType(viewer, d.name) });
    const id = d.action === "save" ? await saveCatalogProduct(viewer, d.id, d.form, d.publish) : await publishCatalogProduct(viewer, d.id);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
