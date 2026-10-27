import { prisma } from "@/lib/prisma";
import { hireOverviewData } from "@/lib/live-work";
import { PathBand, type BandStep } from "@/components/hire/HireUI";

// NC-E006: the buyer's end-to-end step strip (1 Create Job → … → 6 Request to Hire → Order Created) — on Hire and the dashboard.
// Each step shows its count and opens its list; steps waiting on you carry a red dot.
export async function HireBand({ personId }: { personId: string }) {
  const d = await hireOverviewData(personId);
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
    return { key: t.key, label, top: <span className={`text-[22px] font-extrabold ${c ? (i === active ? "text-magenta" : "text-ink") : "text-state-border"}`}>{c}</span>, bar: i <= active ? "done" : "todo", current: i === active, needs: c > 0 && !!needs[t.key], href: t.key === "wo" ? "/orders/overview" : `/hire/overview?tab=jobs&step=${t.step}`, muted: !c && i !== active };
  });
  return <PathBand steps={band} label="Job Timeline" />;
}
