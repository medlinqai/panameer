import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { connectionsView, membersView, parseFilters } from "@/lib/connections-filter";

// All Filters panel: how many of your connections match the draft filters.
export async function GET(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const f = parseFilters(sp);
  const v = sp.scope === "members" ? await membersView(viewer, f) : await connectionsView(viewer, f);
  return NextResponse.json({ count: v.rows.length });
}
