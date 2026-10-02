import { gateStates, milestones, phaseDates, shippedEntries, taskStates } from "@/lib/work-tracker/admin";
import { GATES, MILESTONE_SEGMENT, PHASES, TASKS, stagesForPhase } from "@/lib/work-tracker/catalog";
import { WorkTrackerEditor } from "@/components/admin/work-tracker/WorkTrackerEditor";

/**
 * `/admin/work-tracker` — the Work Tracker Builder (`P2-ALL-E752`).
 *
 * ⚠⚠ **ACCESS IS INHERITED, NOT RE-STATED.** `src/app/admin/layout.tsx` runs
 * `guardPage("canAdminister")` for the whole subtree, so there is no gate in
 * this file and there must not be a second one — two checks of one rule is
 * `E585` on the access layer, and the one that gets forgotten is the one that
 * matters. ⚠ `route-access.ts` is the outer layer; the API route is the third.
 *
 * ⚠ **CATALOG TEXT IS FINE HERE AND ONLY HERE.** This page shows task text and
 * gate criteria — the "how to recreate Panameer" detail — because it is admin
 * only. The public `/status` view model is built elsewhere and shares nothing
 * with this page.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Work Tracker" };

export default async function AdminWorkTrackerPage() {
  const [states, gates, dates, shipped, mstones] = await Promise.all([
    taskStates(),
    gateStates(),
    phaseDates(),
    shippedEntries(),
    milestones(),
  ]);

  /* ⚠ The whole catalog is flattened ONCE, here on the server, into the shape the
     editor renders. The client never re-derives phase→stage→task grouping, so the
     admin view and the public rollup read the same `stagesForPhase` ordering. */
  const phases = PHASES.map((p) => ({
    name: p.name,
    purpose: p.purpose,
    outcome: p.outcome,
    start: dates.get(p.name)?.start?.toISOString().slice(0, 10) ?? "",
    end: dates.get(p.name)?.end?.toISOString().slice(0, 10) ?? "",
    stages: stagesForPhase(p.name).map((stage) => ({
      name: stage,
      tasks: TASKS.filter((t) => t.phase === p.name && t.stage === stage).map((t) => ({
        id: t.id,
        segment: t.segment,
        task: t.task,
        status: states.get(t.id)?.status ?? "Not Started",
        owner: states.get(t.id)?.owner ?? "",
        note: states.get(t.id)?.note ?? "",
        /* ⚠ Only the ten journey rows get a stage picker; an ordinary AIM task
           leaves it null forever and that is correct, not missing data. */
        stage: states.get(t.id)?.stage ?? "",
        isJourney: t.id.startsWith("PNM-") && t.segment !== MILESTONE_SEGMENT,
      })),
    })),
  }));

  const gateRows = GATES.map((g) => ({
    id: g.id,
    after: g.after,
    title: g.title,
    criteria: g.criteria.map(([text], i) => ({
      index: i,
      text,
      /* ⚠ ABSENT IS NOT `No` — an unanswered criterion renders as unanswered so
         an admin can see what has never been decided. */
      value: gates.get(`${g.id}#${i}`) ?? "",
    })),
  }));

  return (
    <WorkTrackerEditor
      phases={phases}
      gates={gateRows}
      milestones={mstones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        date: m.date.toISOString().slice(0, 10),
        status: m.status,
        sort: m.sort,
        published: m.published,
      }))}
      shipped={shipped.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        journeyTag: s.journey_tag ?? "",
        title: s.title,
        body: s.body ?? "",
        published: s.published,
      }))}
    />
  );
}
