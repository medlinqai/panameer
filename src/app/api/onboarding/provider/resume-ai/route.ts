import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { aiExtractResume, aiToParsedResume, aiExtractionAvailable, PROMPT_VERSION } from "@/lib/resume/ai-extract";
import { applyParsedResume } from "@/lib/resume/import";
import type { ParsedResume } from "@/lib/resume/parse";
import { computeRerunDiff } from "@/lib/resume/rerun-diff";
import { getOnboardingState } from "@/lib/onboarding";
import { assessParse } from "@/lib/resume/confidence";

/**
 * POST /api/onboarding/provider/resume-ai — "Let AI take a pass" (WS3/WS4).
 *
 * Re-extracts the provider's most recent import using the model, then applies
 * the result through the SAME path the heuristic uses, so the review step sees
 * no difference beyond better data.
 *
 * Runs on the STORED `raw_text` rather than asking for the file again: it is
 * already on the import row, so the provider doesn't re-upload to change their
 * mind, and we don't re-extract a document we've already read.
 *
 * OWNER-SCOPED. The import is looked up through `ownedProviderProfile`, so this
 * can only ever act on the caller's own résumé — the text being sent to a
 * third-party API makes that boundary matter more here than almost anywhere.
 */
/*
 * NODE RUNTIME, not edge: pdf-parse/pdfjs and mammoth are Node libraries — they
 * want Buffer and real module resolution, neither of which the edge runtime
 * provides (E154).
 */
export const runtime = "nodejs";
/*
 * E184's sibling route got `maxDuration = 60` when it started making a model
 * call. THIS route — the one whose entire job is a model call — never got one,
 * so it ran on the platform default while doing the slowest work in the app.
 * The pair now agree, and `MODEL_TIMEOUT_MS` in ai-provider.ts sits just under
 * this so our own deadline wins the race and produces a message.
 */
/*
  ⚠⚠ 180, NOT 60 (`P2-J1.4-E546`). ⚠ SUPERSEDED, quoted not deleted (`E164`):
  `export const maxDuration = 60;`
  ⚠⚠ THE 60 WAS NEVER VERCEL'S. It came from `E184` (2026-08-04), which assumed
  *"the platform default cuts off well before"* a 20–30 s read. Scott confirmed
  2026-09-17: the project is HOBBY WITH FLUID COMPUTE, whose default AND maximum
  are 300 s. ⚠ THIS ROUTE MOVES WITH THE UPLOAD ROUTE: its single call is granted
  `MODEL_TIMEOUT_MS` (77 s since the 24 s write reserve; 82 s before it), which a 60 s function would have killed mid-call.
  ⚠ 180 fits a whole read of marelise's CV (121 sections, 75.0 s) with
  margin, plus the write tail, inside 300.
  ⚠⚠ DO NOT LOWER IT TO SHORTEN THE WAIT — a lower ceiling brings back the silent
  fallback. The wait is `E547`'s problem (the background job).
*/
export const maxDuration = 180;

/**
 * ── ⚠⚠ `mode: "preview"` — PROPOSE, WRITE NOTHING (`P2-J14-E561` WS-B) ──────
 *
 * ⚠⚠⚠ THE DEFAULT IS UNCHANGED. No body, or any body without `mode:"preview"`,
 * behaves EXACTLY as before — the wizard's review step and every existing caller
 * keep applying on POST. ⚠ A re-run that silently stopped writing would be a
 * worse defect than the one this brief fixes.
 * ⚠ THE HANDLER NOW TAKES `req` ONLY TO READ THAT FLAG; it took none before.
 *
 * ⚠⚠ PREVIEW PARSES AND STORES `parsed` ON THE IMPORT ROW, THEN RETURNS A DIFF.
 * It never calls `applyParsedResume`, so no profile row is touched.
 * ⚠⚠⚠ STORING THE PARSE IS WHAT STOPS THE PROVIDER PAYING FOR TWO READS: `E546`
 * measured 25–70 s and $0.004–0.008 per read, so apply MUST reuse this result
 * rather than parse again. The row is where it lives.
 */
export async function POST(req: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiExtractionAvailable()) {
    // The UI hides the button in this case; this is the server saying the same
    // thing, so a stale page can't start something that cannot finish.
    return NextResponse.json(
      { error: "AI extraction isn't configured on this environment." },
      { status: 503 }
    );
  }

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  }

  const row = await prisma.profileImport.findFirst({
    where: { provider_profile_id: profile.id },
    orderBy: { created_at: "desc" },
    select: { id: true, raw_text: true, parsed: true },
  });
  if (!row?.raw_text) {
    return NextResponse.json(
      { error: "There's no uploaded document to re-read." },
      { status: 404 }
    );
  }

  /*
    ── ⚠⚠⚠ THE BODY IS READ **BEFORE** THE PARSE NOW (`P2-ALL-E782`) ───────

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the reasoning that put it after:
    //   THE MODE IS READ AFTER THE PARSE, DELIBERATELY. The parse is the
    //   expensive half and BOTH modes need it; branching earlier would
    //   duplicate it.
    ⚠⚠ **THAT WAS TRUE OF `preview` vs `apply` AND IS STILL TRUE OF THEM.** It is
    not true of `reuseStored`, whose entire purpose is to SKIP the parse — so the
    one branch that must be decided before the expensive half now is.
  */
  const body = (await req.json().catch(() => null)) as
    | { mode?: string; reuseStored?: boolean }
    | null;
  const preview = body?.mode === "preview";

  /*
    ── ⚠⚠⚠ DO NOT READ THE SAME DOCUMENT TWICE (`P2-ALL-E782`, Scott) ─────

    ⚠ **SCOTT:** *"Don't read the résumé twice. The upload already parsed it."*

    ⚠⚠ **MEASURED ON HIS OWN ROW:** the upload banked a complete parse — 11 keys,
    4 experiences, 78 skills, `ai_model=gpt-5-nano`, `prompt=2026-09-17.a` — and
    cost **64.5 s**. Asking the model again would have cost another 25–70 s and
    $0.004–$0.008 to produce the same answer (load-bearing rule 9: a paid call
    nobody needs is not a convenience an implementation reaches for).
    ⚠ `computeRerunDiff` is pure, so the diff off a banked parse is the same diff.

    ⚠⚠ **IT IS OPT-IN, AND *"Read it again"* STILL MEANS IT.** Only the
    just-uploaded path asks to reuse; the re-read offer exists for a document
    parsed months ago under an older prompt, and silently serving it a cached
    answer would break the one thing it promises.
    ⚠ **IF THERE IS NO BANKED PARSE IT FALLS THROUGH AND READS** — that is a FIRST
    read, not a second, and the caller shows the reading status while it happens.
  */
  const stored = preview && body?.reuseStored === true ? row.parsed : null;
  if (stored) {
    const diff = await computeRerunDiff(
      profile.id,
      /* ⚠ The column holds exactly what `aiToParsedResume` produced; it is JSON on
         the way out, so the shape is re-asserted here and nowhere else. */
      stored as unknown as ParsedResume,
    );
    console.info(`[resume] path=preview-reused import=${row.id}`);
    return NextResponse.json({ ok: true, preview: true, reused: true, diff });
  }

  const outcome = await aiExtractResume(row.raw_text);
  if (!outcome.ok) {
    console.info(`[resume] path=ai-failed reason=${outcome.reason} import=${row.id}`);
    // The heuristic result the provider already has stands. This is a failure to
    // IMPROVE, not a failure to import, and it is reported as such.
    return NextResponse.json(
      { error: outcome.message, fellBack: true },
      { status: 502 }
    );
  }

  const parsed = aiToParsedResume(outcome.data);

  /*
    WS3, second signal. A well-formed response can still be a failure: zero
    entries out of a document the heuristic could see date ranges all over means
    the model returned nothing useful, not that this person has never worked.

    Gated on the DOCUMENT having ≥3 date ranges precisely so a résumé that
    genuinely has no work history — a new graduate's, say — is not false-flagged.
    No dates in the source, no complaint: empty is then a truthful answer and is
    reported as one.
  */
  const sourceConfidence = assessParse(row.raw_text, parsed, { source: "ai" });
  if (
    parsed.experiences.length === 0 &&
    sourceConfidence.signals.dateRangesInText >= 3
  ) {
    console.info(
      `[resume] path=ai-empty ranges=${sourceConfidence.signals.dateRangesInText} import=${row.id}`
    );
    return NextResponse.json(
      {
        error:
          "The reader came back with no work history, but your document looks like it has dates in it. Nothing was changed — try again, or add it manually.",
        fellBack: true,
      },
      { status: 502 }
    );
  }

  /*
    ⚠ THE MODE IS READ AFTER THE PARSE, DELIBERATELY. The parse is the expensive
    half and BOTH modes need it; branching earlier would duplicate it.
    ⚠⚠ A malformed or absent body means APPLY — the historical behaviour.
  */
  if (preview) {
    /* ⚠ Bank the parse so a later apply reuses it without a second model call. */
    await prisma.profileImport.update({
      where: { id: row.id },
      data: { parsed: parsed as unknown as Prisma.InputJsonValue },
    });
    const diff = await computeRerunDiff(profile.id, parsed);
    /* ⚠⚠ NO `applied`, NO `state` — nothing changed, and returning an `applied`
       shape here would invite a caller to render a receipt for a write that
       never happened. */
    return NextResponse.json({ ok: true, preview: true, reused: false, diff });
  }

  const applied = await applyParsedResume(profile.id, parsed, "RESUME");
  const confidence = sourceConfidence;

  /*
    WS-G — bank WHAT the model produced and WHAT IT COST, on the import row.

    The audit that compares this against the user's final edits is written much
    later, at publish; by then the call is long gone, so its provenance has to
    be persisted now. `parsed` is overwritten with the AI result because the
    heuristic pass it replaces is no longer what the review is showing.
  */
  await prisma.profileImport.update({
    where: { id: row.id },
    data: {
      parsed: parsed as unknown as Prisma.InputJsonValue,
      /* ⚠ CAPTURED AT PARSE TIME (`P1-A1.5-E487`) — the audit is written later,
         at review-save, and a prompt edited in between would otherwise be
         recorded against a run it never touched. */
      ai_prompt_version: PROMPT_VERSION,
      ai_model: outcome.model,
      ai_provider: outcome.provider,
      ai_input_tokens: outcome.usage.inputTokens,
      ai_output_tokens: outcome.usage.outputTokens,
      ai_cost_usd: outcome.usage.costUsd,
      ai_latency_ms: outcome.ms,
    },
  }).catch((e) => console.error("[resume] could not record parse provenance:", e));

  console.info(
    `[resume] path=ai-escalated model=${outcome.model} ms=${outcome.ms} ` +
      `chars=${outcome.inputChars} roles=${parsed.experiences.length} ` +
      `education=${parsed.education.length} skills=${parsed.skills.length} ` +
      `confidence=${confidence.score} import=${row.id}`
  );

  return NextResponse.json({
    ok: true,
    applied,
    confidence,
    model: outcome.model,
    state: await getOnboardingState(viewer),
  });
}
