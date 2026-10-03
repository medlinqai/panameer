import { NextResponse } from "next/server";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { todayInSiteZone } from "@/lib/work-tracker/public-time";

/**
 * GET /api/status — the PUBLIC Work Tracker payload (`P2-ALL-E753`).
 *
 * ⚠⚠ **NO GUARD, AND THAT IS DELIBERATE.** This is the public face of the build;
 * it is in `public-routes.ts` beside `/status`. ⚠ What keeps it safe is not a
 * gate but the SHAPE of what it returns — `getPublicTracker` builds every field
 * by hand into types that have nowhere to put task text, task ids, criterion
 * text, notes or owners. ⚠⚠ The leak test asserts that against the real response.
 *
 * ⚠ 60-second revalidate: the tracker changes a few times a day, the page is
 * meant to be reloaded daily by strangers, and a cached minute costs nothing.
 *
 * ── ⚠⚠⚠ `plan` WAS ADDED HERE WITH `E785`, AND THE SAME ARGUMENT CARRIES IT ──
 *
 * ⚠ `/status` renders the plan now, so the public payload has to carry it or the
 * API and the page would describe two different things.
 * ⚠⚠ **IT IS SAFE FOR THE SAME REASON THE REST IS: THE SHAPE.** `PublicPlanRow`
 * has no `admin_note` and no `hours` field at all, so there is nowhere for either
 * to go — not a filter that could be forgotten. ⚠ The leak test asserts it
 * against the real response, including Scott's own admin notes.
 *
 * ⚠ The AIM keys (`phases`, `gates`, `currentPhaseStages`, `journeys`,
 * `overallPercent`, `taskCount`) are UNCHANGED and still served. They are no
 * longer rendered on any page, and they are kept because the AIM checklist is
 * still a live admin surface whose data was explicitly not discarded.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const today = todayInSiteZone();
    const [tracker, plan] = await Promise.all([getPublicTracker(), getPanameerPlan()]);
    return NextResponse.json({
      ...tracker,
      plan: publicPlan(
        { title: plan?.plan.title ?? "Panameer build" },
        plan?.rows ?? [],
        new Date(`${today}T12:00:00Z`),
      ),
    });
  } catch (e) {
    console.error("[status] public tracker failed:", e);
    return NextResponse.json({ error: "Could not load the tracker" }, { status: 500 });
  }
}
