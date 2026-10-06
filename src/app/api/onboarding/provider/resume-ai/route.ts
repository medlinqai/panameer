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

export const runtime = "nodejs";
export const maxDuration = 180;

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

  const body = (await req.json().catch(() => null)) as
    | { mode?: string; reuseStored?: boolean }
    | null;
  const preview = body?.mode === "preview";

  const stored = preview && body?.reuseStored === true ? row.parsed : null;
  if (stored) {
    const diff = await computeRerunDiff(
      profile.id,
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

  // WS3, second signal. A well-formed response can still be a failure: zero
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

  // THE MODE IS READ AFTER THE PARSE, DELIBERATELY. The parse is the expensive
  if (preview) {
    /* Bank the parse so a later apply reuses it without a second model call. */
    await prisma.profileImport.update({
      where: { id: row.id },
      data: { parsed: parsed as unknown as Prisma.InputJsonValue },
    });
    const diff = await computeRerunDiff(profile.id, parsed);
    // NO `applied`, NO `state` — nothing changed, and returning an `applied`
    return NextResponse.json({ ok: true, preview: true, reused: false, diff });
  }

  const applied = await applyParsedResume(profile.id, parsed, "RESUME");
  const confidence = sourceConfidence;

  // WS-G — bank WHAT the model produced and WHAT IT COST, on the import row.
  await prisma.profileImport.update({
    where: { id: row.id },
    data: {
      parsed: parsed as unknown as Prisma.InputJsonValue,
      // CAPTURED AT PARSE TIME — the audit is written later
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
