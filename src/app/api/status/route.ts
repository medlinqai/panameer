import { NextResponse } from "next/server";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { todayInSiteZone } from "@/lib/work-tracker/public-time";

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
