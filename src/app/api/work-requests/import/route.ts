import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkTransact, guardApi } from "@/lib/guard";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { aiExtractJobPosting } from "@/lib/work-request/job-import";
import { matchSkills, suggestableSkills } from "@/lib/resume/match";
import { createDraft, saveSection, WorkRequestError } from "@/lib/work-request";

export const runtime = "nodejs";

/**
 * POST /api/work-requests/import — paste a job posting, get a pre-filled DRAFT
 * (brief_cwr_specializations_and_import WS-B).
 *
 * IT CREATES A DRAFT AND NOTHING ELSE. Never posts, never publishes. The
 * requester lands back in the wizard with the fields filled and has to walk it,
 * because a posting imported from somewhere else is a starting point, not a
 * decision they have made on Panameer.
 *
 * SKILLS GO THROUGH THE CATALOG, not straight onto the request. The extractor
 * returns whatever terms the posting used; `matchSkills` — the same matcher the
 * résumé importer uses — resolves what it can against the chosen role and
 * domain, and everything else comes back as `unmatchedSkills` for the "AI found
 * these, tick the ones that fit" panel. Writing an unmatched term as a skill
 * would put a term in the catalog nobody curated.
 *
 * ROLE AND DOMAIN ARE NOT GUESSED. The cascade is the requester's answer to
 * "what kind of work is this", and inferring it from a paste would have them
 * confirm a taxonomy decision they never made. They pick; the import fills in
 * everything downstream of the pick.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;

  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const text: string = (body?.text ?? "").trim();
  if (text.length < 40) {
    return NextResponse.json(
      { error: "Paste the posting first — that's too short to read." },
      { status: 400 }
    );
  }

  const outcome = await aiExtractJobPosting(text);
  if (!outcome.ok) {
    return NextResponse.json(
      {
        error:
          outcome.reason === "no_key"
            ? "The AI reader isn't switched on here. You can still fill the wizard in by hand."
            : "We couldn't read that posting. You can still fill the wizard in by hand.",
        code: outcome.reason,
      },
      { status: outcome.reason === "no_key" ? 503 : 422 }
    );
  }

  const ai = outcome.data;

  try {
    /*
      A DRAFT FIRST, THEN SECTIONS. Going through `saveSection` rather than one
      big create means every field the import writes passes the same validation
      a human's answer does — a bad date or a reversed budget range is rejected
      here exactly as it would be in the wizard.
    */
    const draft = await createDraft(gate);

    if (ai.description) {
      await saveSection(gate, draft.id, "description", {
        description: ai.description,
        title: ai.title ?? undefined,
      });
    }
    if (ai.startDate || ai.endDate) {
      await saveSection(gate, draft.id, "dates", {
        startDate: ai.startDate,
        endDate: ai.endDate,
      });
    }
    if (ai.budgetMin !== null || ai.budgetMax !== null) {
      await saveSection(gate, draft.id, "budget", {
        budgetType: ai.budgetType,
        budgetMinDollars: ai.budgetMin,
        budgetMaxDollars: ai.budgetMax,
      });
    }
    if (ai.locationCountry || ai.worksite) {
      await saveSection(gate, draft.id, "location", {
        locationCountry: ai.locationCountry,
        worksite: ai.worksite,
      });
    }

    /*
      SKILLS ARE RETURNED, NOT SAVED. They cannot be written until a role and
      domain exist to validate them against, and the requester has not picked
      those yet. The wizard holds them and applies them on the skills step.
    */
    const catalog = await prisma.skill.findMany({
      where: { is_custom: false },
      select: { id: true, name: true },
    });
    const { matched, unmatched } = matchSkills(ai.skills, catalog);

    const workRequest = await prisma.workRequest.findUnique({
      where: { id: draft.id },
      select: { id: true },
    });
    if (!workRequest) throw new Error("draft vanished");

    return NextResponse.json({
      workRequestId: draft.id,
      /** Catalog hits, for the wizard to pre-tick once a role+domain is chosen. */
      matchedSkills: matched,
      /** Off-catalog terms → the "tick the ones that fit" panel. */
      unmatchedSkills: suggestableSkills(unmatched),
      /** What the model actually filled, so the UI can say so honestly. */
      filled: {
        title: Boolean(ai.title),
        description: Boolean(ai.description),
        dates: Boolean(ai.startDate || ai.endDate),
        budget: ai.budgetMin !== null || ai.budgetMax !== null,
        location: Boolean(ai.locationCountry || ai.worksite),
        skills: ai.skills.length,
      },
      parser: { model: outcome.model, tier: outcome.tier, ms: outcome.ms },
    });
  } catch (e) {
    if (e instanceof WorkRequestError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[work-request] import failed:", e);
    return NextResponse.json({ error: "Could not import that posting." }, { status: 500 });
  }
}
