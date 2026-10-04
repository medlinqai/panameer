import { PlanOutlineEditor } from "@/components/plan/PlanOutlineEditor";
import { toEditorRow } from "@/lib/plan/editor-row";
import { PlanStartFrom } from "@/components/plan/PlanStartFrom";
import { planOwnerKey, readiness } from "@/lib/plan/model";
import { ensurePanameerPlan, getPanameerPlan } from "@/lib/plan/store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Build Plan" };

export default async function AdminBuildPlanPage() {
  await ensurePanameerPlan();
  const [plan, releases] = await Promise.all([
    getPanameerPlan(),
    prisma.workTrackerRelease.findMany({
      select: { id: true, code: true, title: true },
      orderBy: [{ sort: "asc" }, { date: "asc" }],
    }),
  ]);

  const rows = plan?.rows ?? [];
  const progress = readiness(rows);

  return (
    <div className="bg-surface">
      <header className="border-b border-line pb-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-magenta">Build Plan</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.3px] text-ink">
          {plan?.plan.title ?? "Panameer build"}
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
          Phases, tasks and milestones — the rows you type here are what
          status.panameer.com shows. This is the same plan tool your work orders will use.
        </p>
        <p className="mt-3 text-[13px] text-ink-2">
          {}
          {progress.percent === null ? (
            <>
              <span className="font-bold text-ink">—</span> complete · no rows to count yet
            </>
          ) : (
            <>
              <span className="font-bold text-ink">{progress.percent}%</span> complete ·{" "}
              {}
              {progress.done} done · {progress.moving} in progress (half credit) ·{" "}
              {progress.total} rows
            </>
          )}
        </p>
        <p className="mt-3 max-w-[70ch] border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-2">
          Enter adds a row · Tab makes it a task under the row above · Shift+Tab moves it back out ·
          Backspace on an empty row deletes it. Notes you add are admin-only unless you put them in
          the public note.
        </p>
      </header>

      <div className="mt-5">
        <PlanStartFrom ownerKey={planOwnerKey()} hasRows={rows.length > 0} />
      </div>

      <div className="mt-6">
        <PlanOutlineEditor
          ownerKey={planOwnerKey()}
          rows={rows.map(toEditorRow)}
          releases={releases.map((r) => ({ id: r.id, label: r.code ? `${r.code} — ${r.title}` : r.title }))}
        />
      </div>
    </div>
  );
}
