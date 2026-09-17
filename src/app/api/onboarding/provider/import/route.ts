import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { importProfileDocument } from "@/lib/resume/import";
import { MAX_DOC_BYTES } from "@/lib/resume/extract";
import { getOnboardingState } from "@/lib/onboarding";

/**
 * POST /api/onboarding/provider/import — résumé import
 * (brief_P / E012). multipart/form-data: `file`, plus `source` =
 * Always "RESUME" (the LinkedIn path was removed in PJv2 WS2 / E069).
 *
 * OWNER-SCOPED: the profile is resolved from the session, never from client
 * input — the same boundary as every other onboarding write.
 */
/*
 * NODE RUNTIME, not edge: pdf-parse/pdfjs and mammoth are Node libraries — they
 * want Buffer and real module resolution, neither of which the edge runtime
 * provides (E154).
 */
export const runtime = "nodejs";
/*
 * E184 — this route now makes a model call, so it is no longer a sub-second
 * request. A full-length résumé takes 20–30s to read; the platform default cuts
 * off well before that and the symptom would be an upload that "just fails" on
 * exactly the long documents the AI is there for.
 */
/*
  ⚠⚠ THIS LITERAL IS MIRRORED BY `ROUTE_MAX_DURATION_S` (`P1-A1.4-E415` WS-2).
  Next.js reads `maxDuration` STATICALLY at build time, so it cannot be an
  imported expression — which is exactly how it drifted out of step with
  `MODEL_TIMEOUT_MS` in the first place. ⚠ `check:import-deadline` §2 asserts
  the two agree, so the pair is checked rather than remembered.
*/
/*
  ⚠⚠ 180, NOT 60 (`P2-J1.4-E546`). ⚠ SUPERSEDED, quoted not deleted (`E164`):
  `export const maxDuration = 60;`
  ⚠⚠ THE 60 WAS NEVER VERCEL'S. It came from `E184` (2026-08-04), which assumed
  *"the platform default cuts off well before"* a 20–30 s read. Scott confirmed
  2026-09-17: the project is HOBBY WITH FLUID COMPUTE, whose default AND maximum
  are 300 s. ⚠ 180 fits a whole read of marelise's CV (121 sections, 75.0 s) with
  margin, plus the write tail, inside 300.
  ⚠⚠ DO NOT LOWER IT TO SHORTEN THE WAIT — a lower ceiling brings back the silent
  fallback. The wait is `E547`'s problem (the background job).
*/
export const maxDuration = 180;

export async function POST(request: Request) {
  /*
    ⚠⚠ THE CLOCK STARTS HERE, NOT AT THE MODEL CALL (`P1-A1.4-E415` WS-2).
    Auth, the profile lookup and reading a 5 MB multipart body all happen before
    the reader sees a byte, and all of it comes out of the same 60 seconds. The
    read is granted what is LEFT at the moment each call is made.
  */
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
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
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
    });

    // A FAILED extraction is a real, reportable outcome (bad/scanned file) —
    // not a server error. 422 keeps it distinguishable from a 500.
    const status = result.status === "FAILED" ? 422 : 200;
    const state = await getOnboardingState(viewer);
    /*
      ⚠ WHAT THE ROUTE ACTUALLY SPENT, AND HOW MUCH OF IT WAS THE TAIL
      (`P1-A1.4-E415` WS-1/WS-3). The tail — writing the import row, applying
      every employer and project, both recomputes, `E413`'s purge and this
      state build — is the half nobody had a number for, and it is what
      `ROUTE_TAIL_RESERVE_MS` has to cover. ⚠ Logged on every import so the
      reserve can be re-derived from real traffic instead of one measurement.
    */
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
