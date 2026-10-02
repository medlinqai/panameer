import { NextResponse } from "next/server";
import { getPublicTracker } from "@/lib/work-tracker/public-view";

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
 */
export const revalidate = 60;

export async function GET() {
  try {
    return NextResponse.json(await getPublicTracker());
  } catch (e) {
    console.error("[status] public tracker failed:", e);
    return NextResponse.json({ error: "Could not load the tracker" }, { status: 500 });
  }
}
