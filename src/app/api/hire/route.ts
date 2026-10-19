import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { HireError, hireMatches, requestProposals, resolveSkill, saveHireJob, setHidden, suggestSkills, type HireInput } from "@/lib/hire-questionnaire";
import { WorkRequestError } from "@/lib/work-request";
import { reparseWho } from "@/lib/service-description";
import { jobPosted } from "@/lib/hire-direct";

// SH2-E004: the Hire questionnaire — suggest skills, save the draft Job, show matches, request proposals.
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const body = (await request.json().catch(() => ({}))) as { action?: string; jobId?: string | null; input?: HireInput; category?: string; title?: string; name?: string; personIds?: string[]; sourceText?: string; businessTypeId?: string };
  try {
    switch (body.action) {
      case "suggest":
        return NextResponse.json({ skills: await suggestSkills(String(body.category ?? ""), String(body.title ?? "")) });
      case "save":
        return NextResponse.json({ jobId: await saveHireJob(gate, body.jobId ?? null, body.input!) });
      case "matches": {
        const jobId = await saveHireJob(gate, body.jobId ?? null, body.input!);
        await jobPosted(gate, jobId, body.input!.title);
        return NextResponse.json({ jobId, matches: await hireMatches(body.input!, await seesTestAccounts(gate), jobId) });
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
      case "request":
        if (!body.jobId || !body.personIds?.length) return NextResponse.json({ error: "Pick at least one." }, { status: 400 });
        return NextResponse.json(await requestProposals(gate, body.jobId, body.personIds));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof HireError || e instanceof WorkRequestError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[hire] failed:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
