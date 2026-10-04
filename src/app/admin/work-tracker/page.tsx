import {
  customTasks,
  gateStates,
  phaseDates,
  releases as releaseList,
  shippedEntries,
  taskStates,
} from "@/lib/work-tracker/admin";
import { GATES, MILESTONE_SEGMENT, PHASES, TASKS, stagesForPhase } from "@/lib/work-tracker/catalog";
import { WorkTrackerEditor } from "@/components/admin/work-tracker/WorkTrackerEditor";

export const dynamic = "force-dynamic";

export const metadata = { title: "AIM Checklist" };

export default async function AdminWorkTrackerPage() {
  const [states, gates, dates, shipped, rels, customs] = await Promise.all([
    taskStates(),
    gateStates(),
    phaseDates(),
    shippedEntries(),
    releaseList(),
    customTasks(),
  ]);

  const phases = PHASES.map((p) => ({
    name: p.name,
    purpose: p.purpose,
    outcome: p.outcome,
    isCurrent: dates.get(p.name)?.isCurrent === true,
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
        stage: states.get(t.id)?.stage ?? "",
        releaseId: states.get(t.id)?.releaseId ?? "",
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
      value: gates.get(`${g.id}#${i}`) ?? "",
    })),
  }));

  return (
    <WorkTrackerEditor
      phases={phases}
      gates={gateRows}
      releases={rels.map((m) => ({
        id: m.id,
        code: m.code ?? "",
        title: m.title,
        summary: m.summary ?? m.description ?? "",
        date: (m.target_date ?? m.date).toISOString().slice(0, 10),
        status: m.status,
        published: m.published,
      }))}
      customTasks={customs.map((c) => ({
        id: c.id,
        title: c.title,
        phase: c.phase,
        status: c.status,
        releaseId: c.release_id ?? "",
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
