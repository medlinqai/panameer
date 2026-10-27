import { prisma } from "@/lib/prisma";
import { hireOverviewData } from "@/lib/live-work";
import { PathBand, type BandStep } from "@/components/hire/HireUI";
import type { AttentionItem } from "@/lib/attention";
import { countActions } from "@/lib/tile-actions";

// NC-E006: the buyer's end-to-end step strip (1 Create Job → … → 6 Request to Hire → Order Created) — on Hire and the dashboard.
// Each step shows its count and opens its list; steps waiting on you carry a red dot.
// Speed (10-27): the job data behind the band costs ~3–4 s, so it's kept per buyer for 5 minutes (the Worklist's cadence).
const BAND_TTL_MS = 5 * 60_000;
const bandData = new Map<string, { at: number; d: Awaited<ReturnType<typeof hireOverviewData>> }>();
async function overviewFor(personId: string) {
  const hit = bandData.get(personId);
  if (hit && hit.at > Date.now() - BAND_TTL_MS) return hit.d;
  const d = await hireOverviewData(personId);
  bandData.set(personId, { at: Date.now(), d });
  return d;
}

// WA-E002: a step's Worklist groups → "n Actions →" under it (no red dots).
const STEP_GROUPS: Record<string, string[]> = { availability: ["Compare Answers", "Answer Date Passed"], interview: ["Interview Times to Confirm"], hire: ["Request Approvals"], wo: ["Orders to Accept"] };

export async function HireBand({ personId, actions = [] }: { personId: string; actions?: AttentionItem[] }) {
  const d = await overviewFor(personId);
  // MD-E006: the six Job Timeline steps (+ Order Created) — each job counted once, at its current step.
  const asked = new Set((await prisma.questionSet.findMany({ where: { job_id: { in: d.jobRows.map((j) => j.id) } }, select: { job_id: true } })).map((q) => q.job_id));
  const TIMELINE: { key: string; label: string; steps: string[]; step: string }[] = [
    { key: "create", label: "1. Create Job", steps: ["job"], step: "job" },
    { key: "choose", label: "2. Choose Provider(s)", steps: ["shortlist"], step: "shortlist" },
    { key: "availability", label: "3. Request Availability", steps: ["request", "proposals"], step: "proposals" },
    { key: "questions", label: "4. Ask Questions", steps: [], step: "proposals" },
    { key: "interview", label: "5. Interview Provider(s)", steps: ["interview", "test"], step: "interview" },
    { key: "hire", label: "6. Request to Hire", steps: ["award", "approval"], step: "award" },
    { key: "wo", label: "Order Created", steps: ["wo"], step: "wo" },
  ];
  const live = d.jobRows.filter((j) => !j.draft && !j.completed);
  const countFor = (t: (typeof TIMELINE)[number]) => t.key === "questions" ? live.filter((j) => asked.has(j.id) && ["request", "proposals"].includes(j.step)).length
    : t.key === "availability" ? live.filter((j) => t.steps.includes(j.step) && !asked.has(j.id)).length
    : t.key === "wo" ? d.jobRows.filter((j) => j.step === "wo").length : live.filter((j) => t.steps.includes(j.step)).length;
  const counts = TIMELINE.map(countFor);
  const needs: Record<string, boolean> = { availability: d.needs.proposals, questions: d.needs.proposals, interview: d.needs.interview || d.needs.test };
  const firstNeed = TIMELINE.findIndex((t, i) => needs[t.key] && counts[i] > 0);
  const lastBusy = Math.max(-1, ...TIMELINE.map((t, i) => (t.key !== "wo" && counts[i] > 0 ? i : -1)));
  const active = firstNeed >= 0 ? firstNeed : lastBusy;
  const band: BandStep[] = TIMELINE.map((t, i) => {
    const c = counts[i];
    const label = t.key === "wo" ? <>Order Created · <span className="text-magenta-dark">Orders →</span></> : t.label;
    return { key: t.key, label, top: <span className={`text-[22px] font-extrabold ${c ? "text-ink" : "text-state-border"}`}>{c}</span>, bar: i <= active ? "done" : "todo", current: i === active, actions: STEP_GROUPS[t.key] ? countActions(actions, `/worklist?group=${encodeURIComponent(STEP_GROUPS[t.key].join(","))}`, (g) => STEP_GROUPS[t.key].includes(g.title ?? g.what)) : undefined, href: t.key === "wo" ? "/orders/overview" : `/hire/overview?tab=jobs&step=${t.step}`, muted: !c && i !== active };
  });
  return <PathBand steps={band} label="Job Timeline" />;
}
