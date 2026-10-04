import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { assignProviderDirectly } from "@/lib/selection";

const bodySchema = z
  .object({
    providerPersonId: z.string().uuid(),
    unitPriceCents: z.number().int().positive(),
    uom: z.string().max(20).nullish(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That assignment couldn't be read.", code: "BAD_BODY" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await assignProviderDirectly(gate, {
        workRequestId: id,
        providerPersonId: parsed.data.providerPersonId,
        unitPriceCents: parsed.data.unitPriceCents,
        uom: parsed.data.uom ?? null,
      })
    );
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[selection] direct assign failed:", e);
    return NextResponse.json({ error: "Could not assign that provider." }, { status: 500 });
  }
}
