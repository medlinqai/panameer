import { PlanOutlineEditor } from "@/components/plan/PlanOutlineEditor";
import { toEditorRow } from "@/lib/plan/editor-row";
import { PlanStartFrom } from "@/components/plan/PlanStartFrom";
import { PLAN_OWNER_PANAMEER, readiness } from "@/lib/plan/model";
import { ensurePanameerPlan, getPanameerPlan } from "@/lib/plan/store";
import { prisma } from "@/lib/prisma";

/**
 * `/admin/build-plan` — **Build Plan** (`P2-ALL-E784`).
 *
 * ⚠⚠ **ACCESS IS INHERITED, NOT RE-STATED.** `src/app/admin/layout.tsx` runs
 * `guardPage("canAdminister")` for the whole subtree and `route-access.ts`
 * claims the `/admin` prefix, so there is no gate in this file and there must
 * not be a second one — two checks of one rule is `E585` on the access layer,
 * and the one that gets forgotten is the one that matters.
 *
 * ⚠ The editor and the start-from panel are both reusable: a work order mounts
 * the same two components in R2 against its own owner key.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Build Plan" };

export default async function AdminBuildPlanPage() {
  /** ⚠ The plan record is created HERE, by an admin opening the page — never by
   *  a migration or a seed. The database is shared with production, so content
   *  made at deploy time is content nobody chose. */
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
          {/*
            ⚠⚠ A REAL ZERO AND AN UNCOUNTABLE FIGURE MUST NOT LOOK THE SAME
            (`decisions_2026-09-23.md` §1). An empty plan has nothing to
            measure, so the dash carries its reason rather than reading as 0%.
            ⚠ The figure comes from `readiness()` — the same function `/status`
            uses, so the two pages cannot disagree.
          */}
          {progress.percent === null ? (
            <>
              <span className="font-bold text-ink">—</span> complete · no rows to count yet
            </>
          ) : (
            <>
              <span className="font-bold text-ink">{progress.percent}%</span> complete ·{" "}
              {progress.done} of {progress.total} rows done
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
        <PlanStartFrom ownerKey={PLAN_OWNER_PANAMEER} hasRows={rows.length > 0} />
      </div>

      <div className="mt-6">
        <PlanOutlineEditor
          ownerKey={PLAN_OWNER_PANAMEER}
          rows={rows.map(toEditorRow)}
          releases={releases.map((r) => ({ id: r.id, label: r.code ? `${r.code} — ${r.title}` : r.title }))}
        />
      </div>
    </div>
  );
}
