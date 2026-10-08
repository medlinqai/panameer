import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { phaseCard } from "@/lib/plan/status-card";
import { todayInSiteZone } from "@/lib/work-tracker/public-time";

// Link-preview image for status.panameer.com (Scott 2026-10-07, option A): live phase %, days to release.
export const revalidate = 3600;
export const alt = "Panameer Work Tracker";
export const size = { width: 1200, height: 627 };
export const contentType = "image/png";

const INK = "#272334";
const MAGENTA = "#d72cd6";

export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), "public/brand/panameer-lockup-on-dark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  let title = "Watch Panameer get built";
  let pct: number | null = null;
  let release: { title: string; days: number } | null = null;
  try {
    const todayIso = todayInSiteZone();
    const plan = await getPanameerPlan();
    const pv = publicPlan({ title: plan?.plan.title ?? "Panameer build" }, plan?.rows ?? [], new Date(`${todayIso}T12:00:00Z`));
    const card = phaseCard(pv.rows, todayIso);
    if (card.phase) {
      title = `${card.phase.number} ${card.phase.title}`;
      pct = card.phase.percent;
    }
    release = card.release;
  } catch {
    // No plan data → brand-only card.
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INK, color: "#fff", padding: "64px 72px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={311} height={64} alt="" />
        <div style={{ marginTop: 70, fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: MAGENTA }}>
          Work Tracker · Built in public
        </div>
        <div style={{ marginTop: 14, fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, display: "flex" }}>{title}</div>
        <div style={{ flex: 1 }} />
        {(pct !== null || release) && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>{pct !== null ? `${pct}% complete` : ""}</div>
            {release && (
              <div style={{ display: "flex" }}>
                <span style={{ color: MAGENTA, marginRight: 10 }}>{release.days === 0 ? "Today" : `${release.days} day${release.days === 1 ? "" : "s"}`}</span>
                {release.days === 0 ? `: ${release.title}` : `to ${release.title}`}
              </div>
            )}
          </div>
        )}
        {pct !== null && (
          <div style={{ marginTop: 18, height: 22, background: "#4a4658", display: "flex" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: "#fff" }} />
          </div>
        )}
        <div style={{ marginTop: 26, fontSize: 24, color: "#b9b6c6" }}>status.panameer.com</div>
      </div>
    ),
    size,
  );
}
