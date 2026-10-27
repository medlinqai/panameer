import type { Viewer } from "@/lib/access";
import { buyerDashboard } from "@/lib/dashboard/buyer";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { DashboardTop } from "@/components/dashboard/DashboardTop";
import { JobAgentBanner } from "@/components/work/JobAgentBanner";
import { MyProgress } from "@/components/dashboard/MyProgress";
import type { PeriodKey } from "@/lib/dashboard/periods";
import type { DashData } from "@/lib/dashboard/types";

// MD-E003/E004: the dashboard — 1 · Things You Need to Do, then 2 · My Progress.
// Speed (10-27): the tiles' numbers are kept for 60 s per person (the action counts beside them are always fresh).
const TILE_TTL_MS = 60_000;
const tiles = new Map<string, { at: number; p: Promise<DashData> }>();
function tilesFor(viewer: Viewer, side: "buyer" | "provider", personId: string): Promise<DashData> {
  const key = `${personId}:${side}`;
  const hit = tiles.get(key);
  if (hit && hit.at > Date.now() - TILE_TTL_MS) return hit.p;
  const p = side === "buyer" ? buyerDashboard(viewer, personId) : sellerDashboard(personId, viewer);
  tiles.set(key, { at: Date.now(), p });
  p.catch(() => tiles.delete(key));
  return p;
}

// Speed (10-27): the tiles' data, the action counts and My Progress all start at once — nothing waits on anything else.
export function Dashboard({ viewer, side, personId, firstName, period = "quarter" }: { viewer: Viewer; side: "buyer" | "provider"; personId: string; firstName: string; period?: PeriodKey }) {
  const data = tilesFor(viewer, side, personId);
  return (
    <div className="mb-10">
      {side === "provider" && <JobAgentBanner />}
      <DashboardTop viewer={viewer} side={side} firstName={firstName} data={data} personId={personId} />
      <MyProgress side={side} personId={personId} period={period} />
    </div>
  );
}
