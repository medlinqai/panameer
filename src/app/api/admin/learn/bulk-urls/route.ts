import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { planBulkUrls, applyBulkUrls } from "@/lib/learn-bulk";

const BODY = z.object({
  csv: z.string().min(1, "That file was empty."),
  /** false = dry run (the preview). true = write the confident matches. */
  apply: z.boolean().default(false),
});

/** A CSV big enough to be a mistake rather than a catalog. */
const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/admin/learn/bulk-urls — plan or apply a batch of lesson video URLs.
 *
 * The SAME endpoint does both, with `apply` deciding, so the preview an admin
 * approved and the write that follows can never be computed by different code.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid request." },
      { status: 400 }
    );
  }
  if (parsed.data.csv.length > MAX_CSV_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 2 MB — is it really a URL list?" },
      { status: 413 }
    );
  }

  try {
    const result = parsed.data.apply
      ? await applyBulkUrls(parsed.data.csv)
      : await planBulkUrls(parsed.data.csv);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin/learn] bulk urls failed:", e);
    return NextResponse.json({ error: "Could not process that file." }, { status: 500 });
  }
}
