import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { HireError, discardDraft, hireMatches, requestProposals, resolveSkill, saveHireJob, setHidden, suggestSkills, suggestRange, type HireInput } from "@/lib/hire-questionnaire";
import { WorkRequestError } from "@/lib/work-request";
import { reparseWho } from "@/lib/service-description";
import { jobPosted } from "@/lib/hire-direct";
import { openSourcingEvent, setStar } from "@/lib/sourcing-events";

// SH2-E004: the Hire questionnaire — suggest skills, save the draft Job, show matches, request proposals.
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const body = (await request.json().catch(() => ({}))) as { action?: string; jobId?: string | null; input?: HireInput; category?: string; title?: string; name?: string; personIds?: string[]; hours?: number; on?: boolean; sourceText?: string; businessTypeId?: string };
  try {
    switch (body.action) {
      case "suggest":
        return NextResponse.json({ skills: await suggestSkills(String(body.category ?? ""), String(body.title ?? "")) });
      case "rateRange":
        return NextResponse.json({ range: await suggestRange(body.input!, await seesTestAccounts(gate)) });
      case "save":
        return NextResponse.json({ jobId: await saveHireJob(gate, body.jobId ?? null, body.input!) });
      case "matches": {
        const jobId = await saveHireJob(gate, body.jobId ?? null, body.input!);
        await jobPosted(gate, jobId, body.input!.title);
        return NextResponse.json({ jobId, matches: await hireMatches(body.input!, await seesTestAccounts(gate), jobId, gate) });
      }
      case "reparseWho": {
        // PC-E002: the buyer changed the Business Type — pass 2 again for WHO only.
        const who = await reparseWho(String(body.sourceText ?? ""), String(body.businessTypeId ?? ""));
        return who ? NextResponse.json({ who }) : NextResponse.json({ error: "We couldn't re-read the posting for that Business Type." }, { status: 422 });
      }
      case "hide":
      case "unhide":
        if (!body.jobId || !body.personIds?.[0]) return NextResponse.json({ error: "Pick a provider." }, { status: 400 });
        await setHidden(gate, body.jobId, body.personIds[0], body.action === "hide");
        return NextResponse.json({ ok: true });
      case "resolveSkill":
        return NextResponse.json({ skill: await resolveSkill(String(body.name ?? "")) });
      case "discard":
        if (!body.jobId) return NextResponse.json({ error: "Pick a draft." }, { status: 400 });
        await discardDraft(gate, body.jobId);
        return NextResponse.json({ ok: true });
      case "star":
        if (!body.jobId || !body.personIds?.[0]) return NextResponse.json({ error: "Pick a provider." }, { status: 400 });
        await setStar(gate, body.jobId, body.personIds[0], body.on !== false);
        return NextResponse.json({ ok: true });
      case "request":
        if (!body.jobId || !body.personIds?.length) return NextResponse.json({ error: "Pick at least one." }, { status: 400 });
        // SE-E003: from the shortlist with a deadline in hours → a Sourcing Event; without hours, the older 7-day request.
        if (body.hours != null) return NextResponse.json(await openSourcingEvent(gate, body.jobId, body.personIds, Number(body.hours)));
        return NextResponse.json(await requestProposals(gate, body.jobId, body.personIds));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "hire", [HireError, WorkRequestError]);
  }
}
