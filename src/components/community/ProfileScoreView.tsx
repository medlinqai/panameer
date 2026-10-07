"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  SCORE_GROUP_LABELS,
  lineCounts,
  type ProfileScore,
  type ScoreGroup,
  type ScoreLine,
} from "@/lib/completeness";
import { SCORE_LINE_COPY, DECLARED_NONE_RIDER } from "@/lib/profile-score-copy";
import { openScoreLines, openScoreMinutes } from "@/lib/score-open";
import { editHref } from "@/lib/profile-sections";
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import { FREE_AS_OF_LINE } from "@/lib/free-as-of";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import "./profile-score.css";

// R-C3: built to mockups/score_health_clean_2026-10-03.html. One ring, one list per side.

const hrefFor = (l: ScoreLine) => {
  const copy = SCORE_LINE_COPY[l.key];
  return copy.editorSlug ? editHref(copy.editorSlug) : copy.href;
};

export function ProfileScoreView({ score, profileId }: { score: ProfileScore; profileId?: string }) {
  const router = useRouter();
  const { cycle, secondsLeft } = useRebuild();
  const [hover, setHover] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(() => openScoreLines(score), [score]);
  const done = useMemo(() => score.lines.filter((l) => lineCounts(l.state)), [score.lines]);
  const missingPoints = open.reduce((a, l) => a + l.points, 0);
  const minutes = openScoreMinutes(open);
  const next = open[0] ?? null;

  const R = 118;
  const C = 2 * Math.PI * R;
  const GAP = 3;
  // Ring order = group order, so the purple steps from dark to light all the way round.
  const groupOrder = Object.keys(SCORE_GROUP_LABELS) as ScoreGroup[];
  const ringLines = [...score.lines].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
  const segments = ringLines.reduce<{ line: ScoreLine; len: number; offset: number }[]>((acc, l) => {
    const used = acc.reduce((a, s) => a + (s.line.points / 100) * C, 0);
    acc.push({ line: l, len: (l.points / 100) * C - GAP, offset: -used });
    return acc;
  }, []);
  const hovered = hover ? score.lines.find((l) => l.key === hover) : null;

  async function declareNone(line: ScoreLine["key"]) {
    setBusy(line);
    setError(null);
    try {
      const r = await fetch("/api/settings/profile-declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line, declared: true }),
      });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not save that.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not save that.");
    } finally {
      setBusy(null);
    }
  }

  const say = next
    ? open.length === 1
      ? `One line left. ${SCORE_LINE_COPY[next.key].action}${next.declarable ? ', or mark "I have none",' : ""} to reach 100 — about ${minutes} minute${minutes === 1 ? "" : "s"}.`
      : `${open.length} lines left, worth ${missingPoints} points — about ${minutes} minutes. Start with ${next.label}. "I have none" counts too.`
    : "Every line is answered — you're at 100. Nothing is waiting on you.";

  const groups = Object.keys(SCORE_GROUP_LABELS) as ScoreGroup[];
  const columns: ScoreGroup[][] = [groups.slice(0, 1), groups.slice(1)];

  return (
    <div className="pm-score mx-auto max-w-[1010px]">
      <div className="pt-3.5" />

      <AccountHero
        picture={
          <>
            <div className="pm-score-dial">
              <svg viewBox="0 0 300 300" className="pm-score-svg" role="img" aria-label={`Search Score ${score.total} of 100`}>
                <g key={cycle} className="pm-rebuild-draw">
                  {segments.map((s, i) => (
                    <circle
                      key={s.line.key}
                      cx="150"
                      cy="150"
                      r={R}
                      fill="none"
                      strokeWidth={!lineCounts(s.line.state) ? (hover === s.line.key ? 12 : 8) : hover === s.line.key ? 30 : 22}
                      strokeLinecap="butt"
                      strokeDasharray={`${s.len} ${C - s.len}`}
                      strokeDashoffset={s.offset}
                      className={"pm-score-seg " + paintClass(s.line.state) + (hover && hover !== s.line.key ? " pm-score-dim" : "")}
                      style={{ animationDelay: `${i * 70}ms`, ...(lineCounts(s.line.state) ? { stroke: stepShade(i, segments.length) } : {}) }}
                      onMouseEnter={() => setHover(s.line.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(s.line.key)}
                      onBlur={() => setHover(null)}
                      tabIndex={0}
                      data-seg={s.line.key}
                      aria-label={`${s.line.label}, ${s.line.points} points`}
                    />
                  ))}
                </g>
              </svg>
              <div className="pm-score-core">
                <div className="text-[54px] font-bold leading-none text-magenta">{score.total}</div>
                <div className="mt-1 text-[11px] font-bold tracking-[0.14em] text-ink">OF 100</div>
                {hovered && (
                  <p className="mt-2 text-[11.5px] leading-snug text-ink-2">
                    <b>{hovered.label}</b> · {hovered.points} pts
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2 flex justify-center">
              <RebuildBadge secondsLeft={secondsLeft} />
            </div>
          </>
        }
        eyebrow="Search Score"
        title="Supercharge Your Exposure to Buyers"
        kpiTestId="score-kpis"
        kpis={[
          { value: score.total, label: "SEARCH SCORE" },
          { value: done.length, label: "LINES ANSWERED" },
          { value: open.length, label: "LINES LEFT" },
        ]}
        paragraph={
          <p data-score-say>
            {say} <span className="text-ink-3">{FREE_AS_OF_LINE}</span>
          </p>
        }
        actions={
          <>
            {next && (
              <Link href={hrefFor(next)} className={HERO_BTN}>
                {SCORE_LINE_COPY[next.key].action} (+{next.points})
              </Link>
            )}
            {next?.declarable && (
              <button type="button" className={HERO_BTN_W} disabled={busy === next.key} onClick={() => declareNone(next.key)}>
                {busy === next.key ? "Saving…" : "I Have None"}
              </button>
            )}
            {profileId && (
              <Link href={`/providers/${profileId}`} className={next ? HERO_BTN_W : HERO_BTN}>
                How Others See My Profile
              </Link>
            )}
          </>
        }
      />

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

      {/* Health's lower half: two columns split by one vertical rule; each group lists its lines. */}
      <div className="mt-9 grid border-t border-line md:grid-cols-2" data-testid="score-lines">
        {columns.map((col, ci) => (
          <section key={ci} className={ci ? "border-t border-line py-5 md:border-l md:border-t-0 md:pl-7" : "py-5 md:pr-7"}>
            {col.map((g) => {
              const inGroup = score.lines.filter((l) => l.group === g);
              if (inGroup.length === 0) return null;
              const got = inGroup.filter((l) => lineCounts(l.state)).reduce((a, l) => a + l.points, 0);
              const all = inGroup.reduce((a, l) => a + l.points, 0);
              return (
                <div key={g} className="mb-4" data-score-group={g}>
                  <h2 className="mb-1.5 flex items-baseline justify-between text-[19px] font-bold">
                    <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3" style={{ background: shadeFor(g) }} />{SCORE_GROUP_LABELS[g]}</span>
                    <small className="text-[13px] font-semibold text-ink-2">
                      {got} / {all}
                    </small>
                  </h2>
                  {inGroup.map((l) => {
                    const ok = lineCounts(l.state);
                    return (
                      <Row key={l.key} onHover={setHover} lineKey={l.key} active={hover === l.key} done={ok}>
                        <span className="flex min-w-0 items-center">
                          {ok ? (
                            <span className="mr-2.5 inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[11px] text-white" style={{ background: stepShade(Math.max(0, segments.findIndex((x) => x.line.key === l.key)), segments.length) }}>✓</span>
                          ) : (
                            <span className="mr-2.5 inline-flex h-[18px] w-[18px] flex-none border-2 border-magenta" />
                          )}
                          <span className="min-w-0">
                            {l.label}
                            {l.state === "declared_none" && <span className="block text-[11px] text-ink-3">{DECLARED_NONE_RIDER}</span>}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center justify-end gap-x-2 text-[13px]">
                          {!ok && (
                            <>
                              <Link href={hrefFor(l)} className="font-semibold text-magenta-dark hover:underline">
                                {SCORE_LINE_COPY[l.key].action}
                              </Link>
                              {l.declarable && (
                                <button type="button" onClick={() => declareNone(l.key)} disabled={busy === l.key} className="font-semibold text-magenta-dark hover:underline disabled:opacity-60">
                                  {busy === l.key ? "Saving…" : "I Have None"}
                                </button>
                              )}
                            </>
                          )}
                          <span data-points className={ok ? "text-ink-2" : "font-semibold text-magenta-dark"}>
                            {ok ? l.points : `+${l.points}`}
                          </span>
                        </span>
                      </Row>
                    );
                  })}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <div className="h-[60px]" />
    </div>
  );
}



function Row({
  children,
  lineKey,
  onHover,
  active,
  done,
}: {
  children: React.ReactNode;
  lineKey: string;
  onHover: (k: string | null) => void;
  active: boolean;
  done?: boolean;
}) {
  // Two-way link (P-E001): hovering the ring segment highlights its row — tint + ink left rule, no scroll.
  return (
    <div
      data-line={lineKey}
      data-active={active ? "true" : undefined}
      data-done={done ? "true" : "false"}
      className={
        "flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14px] transition-colors " +
        (active ? "bg-ink/[0.05] shadow-[inset_2px_0_0_var(--color-ink)]" : "")
      }
      onMouseEnter={() => onHover(lineKey)}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </div>
  );
}

// Both answered states count, so both paint as filled; the class still tells them apart.
// Health's palette: answered (filled or "I have none") = solid ink, open = solid magenta.
// Each group answered in its own lightness of the Panameer logo's purple (Scott 2026-10-07,
// "purple in different lightnesses like my logo"): darkest → lightest in group order.
// Open lines are a light grey track (the open checkbox keeps its magenta outline).
const GROUP_SHADES = ["#DD8FDF", "#9E3A9F", "#64195F"];
function shadeFor(group: ScoreGroup): string {
  const i = (Object.keys(SCORE_GROUP_LABELS) as ScoreGroup[]).indexOf(group);
  return GROUP_SHADES[Math.max(0, i) % GROUP_SHADES.length];
}
// Like the Panameer logo: starts super light at 12 o'clock and gets steadily darker
// clockwise until 11:59 (Scott 2026-10-07). Stops sampled from the logo.
function stepShade(i: number, n: number): string {
  const stops = [[0xed, 0xdb, 0xf3], [0xd4, 0x58, 0xd4], [0x55, 0x12, 0x57]];
  const t = n <= 1 ? 0 : i / (n - 1);
  const [a, b, u] = t < 0.5 ? [stops[0], stops[1], t / 0.5] : [stops[1], stops[2], (t - 0.5) / 0.5];
  return "#" + a.map((v, k) => Math.round(v + (b[k] - v) * u).toString(16).padStart(2, "0")).join("");
}

function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}
