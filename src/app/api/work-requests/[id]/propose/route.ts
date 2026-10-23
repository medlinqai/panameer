import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { submitProposal } from "@/lib/proposals";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    coverNote: z.string().max(4000).nullish(),
    validUntil: z.string().max(40).nullish(),
    rate: z
      .object({
        unitPriceCents: z.number().int().positive(),
        basis: z.enum(["RATE", "AMOUNT"]).optional(),
        uom: z.string().max(20).nullish(),
      })
      .strict()
      .nullish(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canProvideServices");
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
    return NextResponse.json(
      { error: "That response couldn't be read.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  try {
    const result = await submitProposal(gate, {
      workRequestId: id,
      coverNote: parsed.data.coverNote ?? null,
      validUntil: parsed.data.validUntil ?? null,
      rate: parsed.data.rate ?? null,
    });
    // CA-E006: the dates are the job's — the response starts on the job's Start Date.
    await prisma.proposal.updateMany({ where: { id: result.id, reconfirm_needed_at: { not: null } }, data: { reconfirmed_at: new Date() } });
    const job = await prisma.job.findUnique({ where: { id }, select: { start_date: true } });
    if (job?.start_date) await prisma.proposalLine.updateMany({ where: { proposal_id: result.id, available_from: null }, data: { available_from: job.start_date } });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_INVITED" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[proposals] submit failed:", e);
    return apiError(e, "work-requests/[id]/propose");
  }
}
