import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { addCustomRate, publishCatalog, saveCatalogService, suggestType } from "@/lib/build-catalog";

const UNITS = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"] as const;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("service"), serviceTypeId: z.string().uuid(), on: z.boolean(), rateCents: z.number().int().min(0).max(100_000_000).nullable().optional(), unit: z.enum(UNITS).nullable().optional(), expenses: z.enum(["AT_COST", "INCLUDED", "NOT_APPLICABLE"]).nullable().optional(), hoursIncluded: z.number().int().min(0).max(1000).nullable().optional(), offersOverride: z.boolean().nullable().optional() }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("addRate"), name: z.string().trim().min(3).max(60), unit: z.enum(UNITS), delivery: z.enum(["ONSITE", "OFFSITE", "EITHER"]) }),
  z.object({ action: z.literal("suggest"), name: z.string().trim().min(3).max(60), kind: z.enum(["SERVICE", "SERVICE_PRODUCT"]) }),
]);

// TX-E004: Build Your Catalog — owner-scoped from the session in the lib.
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const d = b.data;
    if (d.action === "service") return NextResponse.json({ ok: true, service: await saveCatalogService(viewer, d) });
    if (d.action === "addRate") return NextResponse.json({ ok: true, service: await addCustomRate(viewer, d) });
    if (d.action === "publish") return NextResponse.json({ ok: true, published: await publishCatalog(viewer) });
    return NextResponse.json({ ok: true, ...(await suggestType(viewer, d.name, d.kind)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
