import { phaseCard, phaseDaysLabel, daysBetween } from "@/lib/plan/status-card";
import { todayInSiteZone } from "@/lib/work-tracker/public-time";
import type { PublicPlanRow } from "@/lib/plan/public";

// /status phase card: pick, days to release across ET midnight + DST, past due, between phases, no release.
let pass = 0;
const fails: string[] = [];
const check = (n: string, ok: boolean, d = "") => (ok ? pass++ : fails.push(`${n}${d ? " — " + d : ""}`));
let n = 0;
const row = (p: Partial<PublicPlanRow>): PublicPlanRow => ({
  id: `r${n++}`, number: "", mark: "", title: "", type: "task", status: "Planned", late: false, start: null, end: null, note: null, owner: null, releaseId: null,
  progress: null, children: [], ...p,
});
const plan = (inProgress: string[], deployStatus = "Planned") => [
  row({
    type: "release", number: "1", title: "MVP R1", status: "In progress",
    children: [
      row({ type: "phase", number: "1.2", title: "Design", start: "2026-08-22", end: "2026-09-20", progress: { percent: 90 } as never,
        children: [row({ title: "Mockups", status: inProgress.includes("1.2") ? "In progress" : "Done" })] }),
      row({ type: "phase", number: "1.3", title: "Develop", start: "2026-09-20", end: "2026-11-09", progress: { percent: 24 } as never,
        children: [row({ type: "task", number: "1.3.1", title: "Register", children: [row({ title: "x", status: inProgress.includes("1.3") ? "In progress" : "Planned" })] })] }),
      row({ type: "milestone", number: "1.5", mark: "◆", title: "Deploy", status: deployStatus, start: "2026-11-15", end: "2026-11-15" }),
    ],
  }),
];

const c = phaseCard(plan(["1.3"]), "2026-10-05");
check("1 — the phase with a task in progress is current", c.phase?.number === "1.3" && c.phase.title === "Develop", JSON.stringify(c.phase));
check("2 — its % is the phase row's own", c.phase?.percent === 24);
check("3 — release title rides along", c.phase?.releaseTitle === "MVP R1");
check("4 — Oct 5 → Nov 15 = 41 days", c.release?.days === 41, String(c.release?.days));
check("5 — Oct 5 → Nov 9 = 35 days left in phase", c.phase?.daysLeft === 35);
const two = phaseCard(plan(["1.2", "1.3"]), "2026-10-05");
check("6 — several in progress → the earliest start wins", two.phase?.number === "1.2");
const none = phaseCard(plan([]), "2026-10-05");
check("7 — no task in progress → between phases", none.phase === null && none.release?.days === 41);
check("8 — Deploy marked Done → no upcoming release", phaseCard(plan(["1.3"], "Done"), "2026-10-05").release === null);
check("9 — release past → no upcoming release", phaseCard(plan(["1.3"]), "2026-11-16").release === null);
check("10 — on release day it is 0", phaseCard(plan(["1.3"]), "2026-11-15").release?.days === 0);
check("11 — past the phase end reads past due", phaseDaysLabel(daysBetween("2026-11-12", "2026-11-09")) === "3 days past due");
check("12 — singular day", phaseDaysLabel(1) === "1 day left");
// ET midnight and DST (Nov 1, 2026): 23:30 ET Oct 31 is still Oct 31; 01:30 ET Nov 1 is Nov 1.
const lateOct31 = todayInSiteZone(new Date("2026-11-01T03:30:00Z"));
const earlyNov1 = todayInSiteZone(new Date("2026-11-01T05:30:00Z"));
check("13 — 23:30 ET Oct 31 counts as Oct 31 (15 days)", lateOct31 === "2026-10-31" && daysBetween(lateOct31, "2026-11-15") === 15, lateOct31);
check("14 — 01:30 ET Nov 1 (after DST ends) counts as Nov 1 (14 days)", earlyNov1 === "2026-11-01" && daysBetween(earlyNov1, "2026-11-15") === 14, earlyNov1);
check("15 — 23:59 ET Oct 4 is still Oct 4", todayInSiteZone(new Date("2026-10-05T03:59:00Z")) === "2026-10-04");
if (fails.length) {
  console.log(`check:status-card — ${fails.length} FAILED, ${pass} passed\n`);
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`check:status-card — all ${pass} passed`);
