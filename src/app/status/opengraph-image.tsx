import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { phaseCard, phaseDaysLabel, shortDate, type PhaseCard } from "@/lib/plan/status-card";
import { todayInSiteZone } from "@/lib/work-tracker/public-time";
import { getPublicTracker } from "@/lib/work-tracker/public-view";

// Link-preview image for status.panameer.com (Scott 2026-10-07): the page's top hero, live.
export const revalidate = 3600;
export const alt = "Panameer Work Tracker";
export const size = { width: 1200, height: 627 };
export const contentType = "image/png";

const INK = "#272334";
const MAGENTA = "#d72cd6";
const W70 = "rgba(255,255,255,0.7)";

/** Montserrat from Google Fonts (TTF); null → ImageResponse's default font. */
async function montserrat(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Montserrat:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const logo = await readFile(path.join(process.cwd(), "public/brand/panameer-lockup-white.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  let card: PhaseCard = { phase: null, release: null };
  let day: number | null = null;
  let code: string | null = null;
  try {
    const todayIso = todayInSiteZone();
    const [plan, t] = await Promise.all([getPanameerPlan(), getPublicTracker()]);
    const pv = publicPlan({ title: plan?.plan.title ?? "Panameer build" }, plan?.rows ?? [], new Date(`${todayIso}T12:00:00Z`));
    card = phaseCard(pv.rows, todayIso);
    day = t.dayNumber;
    code = t.currentRelease?.code ?? null;
  } catch {
    // No data → headline only.
  }
  const { phase, release } = card;
  const weights = [400, 600, 700, 800] as const;
  const files = await Promise.all(weights.map(montserrat));
  const fonts = weights.flatMap((weight, i) => {
    const data = files[i];
    return data ? [{ name: "Montserrat", data, weight, style: "normal" as const }] : [];
  });
  const pct = phase?.percent ?? null;
  const fig = { fontSize: 96, fontWeight: 800, lineHeight: 0.9, letterSpacing: -2 } as const;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INK, color: "#fff", padding: "56px 64px", fontFamily: fonts.length ? "Montserrat" : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={330} height={56} alt="" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: W70 }}>
              {`Work Tracker · Building in the open${day !== null ? ` · Day ${day}` : ""}`}
            </div>
            <div style={{ marginTop: 14, fontSize: 72, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, display: "flex", flexWrap: "wrap" }}>
              <span style={{ marginRight: 18 }}>Watch Panameer</span>
              <span style={{ color: MAGENTA }}>get built!</span>
            </div>
            <div style={{ marginTop: 18, fontSize: 24, lineHeight: 1.4, color: "rgba(255,255,255,0.8)" }}>
              We&apos;re eating our own cooking — this is the project tracker you&apos;ll use on your Panameer work orders, and we&apos;re using it to build Panameer.
            </div>
          </div>
          {(phase || release) && (
            <div style={{ width: 430, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.28)", padding: "26px 30px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: W70 }}>
                {phase ? "Current phase" : "Between phases"}
              </div>
              {phase && (
                <div style={{ marginTop: 6, fontSize: 26, fontWeight: 700, display: "flex" }}>
                  {`${phase.number} ${phase.title}`}
                  {phase.releaseTitle && <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>{`· ${phase.releaseTitle}`}</span>}
                </div>
              )}
              <div style={{ marginTop: 20, display: "flex" }}>
                {phase && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ ...fig, display: "flex" }}>
                      {pct === null ? "—" : String(pct)}
                      {pct !== null && <span style={{ fontSize: 40, color: MAGENTA, marginLeft: 2 }}>%</span>}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                      {pct === null ? "not yet counted" : "of this phase"}
                    </div>
                    {phase.daysLeft !== null && <div style={{ marginTop: 4, fontSize: 15, color: "rgba(255,255,255,0.6)" }}>{phaseDaysLabel(phase.daysLeft)}</div>}
                  </div>
                )}
                {release && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingLeft: phase ? 24 : 0, borderLeft: phase ? "1px solid rgba(255,255,255,0.22)" : "none" }}>
                    <div style={{ ...fig, display: "flex" }}>{String(release.days)}</div>
                    <div style={{ marginTop: 10, fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                      {release.days === 0 ? "Release day" : `${release.days === 1 ? "day" : "days"} to ${code ?? "next release"}`}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 15, color: "rgba(255,255,255,0.6)" }}>{shortDate(release.date)}</div>
                  </div>
                )}
              </div>
              {phase && pct !== null && (
                <div style={{ marginTop: 22, height: 6, background: "rgba(255,255,255,0.18)", display: "flex" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: MAGENTA }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 20, color: "#b9b6c6" }}>status.panameer.com</div>
      </div>
    ),
    { ...size, fonts },
  );
}
