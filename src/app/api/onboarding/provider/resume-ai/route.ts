import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { aiExtractResume, aiToParsedResume, aiExtractionAvailable } from "@/lib/resume/ai-extract";
import { applyParsedResume } from "@/lib/resume/import";
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
export async function POST() {
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
    select: { id: true, raw_text: true },
  });
  if (!row?.raw_text) {
    return NextResponse.json(
      { error: "There's no uploaded document to re-read." },
      { status: 404 }
    );
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
  const applied = await applyParsedResume(profile.id, parsed, "RESUME");
  const confidence = assessParse(row.raw_text, parsed, { source: "ai" });

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
