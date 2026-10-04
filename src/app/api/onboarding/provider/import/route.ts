import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { importProfileDocument } from "@/lib/resume/import";
import { MAX_DOC_BYTES } from "@/lib/resume/extract";
import { getOnboardingState } from "@/lib/onboarding";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { providerProfile: { select: { id: true } } },
  });
  const profileId = person?.providerProfile?.id;
  if (!profileId) {
    return NextResponse.json(
      { error: "No provider profile for this user" },
      { status: 404 }
    );
  }

  let file: File | null = null;
  const source = "RESUME" as const;
  let storeOnly = false;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
    storeOnly = form.get("mode") === "store-only";
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 5 MB. Please upload a smaller file." },
      { status: 413 }
    );
  }

  try {
    const result = await importProfileDocument({
      profileId,
      source,
      fileName: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
      startedAt,
      apply: !storeOnly,
    });

    // A FAILED extraction is a real, reportable outcome (bad/scanned file) —
    // not a server error. 422 keeps it distinguishable from a 500.
    const status = result.status === "FAILED" ? 422 : 200;
    const state = await getOnboardingState(viewer);
    const routeMs = Date.now() - startedAt;
    console.info(
      `[resume] route=${routeMs}ms of ${maxDuration}s status=${result.status}`
    );
    /*
      ⚠⚠ STORED, NOT ONLY LOGGED (`P2-J1.4-E546`). A log line is gone tomorrow;
      `route_ms − read_ms` on every row is the real write tail, which is what
      `ROUTE_TAIL_RESERVE_MS` must cover. ⚠ It never fails the upload.
    */
    await prisma.profileImport
      .update({ where: { id: result.importId }, data: { route_ms: routeMs } })
      .catch((e) => console.error("[resume] could not record route_ms:", e));
    return NextResponse.json({ ...result, state }, { status });
  } catch (e) {
    console.error("[onboarding] résumé import failed:", e);
    return NextResponse.json(
      { error: "We couldn't import that file. Please try again." },
      { status: 500 }
    );
  }
}
