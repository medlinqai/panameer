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
import "./profile-score.css";

// R-C3: built to mockups/score_health_clean_2026-10-03.html. One ring, one list per side.
const BTN =
  "inline-flex min-h-11 items-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-60";
const BTN_W =
  "inline-flex min-h-11 items-center border border-ink bg-surface px-6 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-60";

const hrefFor = (l: ScoreLine) => {
  const copy = SCORE_LINE_COPY[l.key];
  return copy.editorSlug ? editHref(copy.editorSlug) : copy.href;
};

export function ProfileScoreView({ score }: { score: ProfileScore }) {
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
  const GAP = 1.5;
  const segments = score.lines.reduce<{ line: ScoreLine; len: number; offset: number }[]>((acc, l) => {
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
      : `${open.length} lines left, worth ${missingPoints} points — about ${minutes} minutes. Start with ${next.label}.`
    : "Every line is answered. Nothing is waiting on you.";

  return (
    <div className="pm-score mx-auto max-w-[1010px]">
      <p className="pb-[26px] pt-3.5 text-[13px] font-semibold">
        Answer every line — &ldquo;I have none&rdquo; counts — and you reach 100.{" "}
        <span className="font-normal text-ink-3">Free as of October 2026.</span>
      </p>

      <section className="grid items-center gap-x-14 gap-y-6 border-b border-line pb-9 md:grid-cols-[340px_1fr]">
        <div>
          <div className="pm-score-dial">
            <svg viewBox="0 0 300 300" className="pm-score-svg" role="img" aria-label={`Search Score ${score.total} of 100`}>
              <circle cx="150" cy="150" r={R} fill="none" className="stroke-line-2" strokeWidth="22" />
              <g key={cycle} className="pm-rebuild-draw">
                {segments.map((s, i) => (
                  <circle
                    key={s.line.key}
                    cx="150"
                    cy="150"
                    r={R}
                    fill="none"
                    strokeWidth={hover === s.line.key ? 30 : 22}
                    strokeLinecap="butt"
                    strokeDasharray={`${s.len} ${C - s.len}`}
                    strokeDashoffset={s.offset}
                    className={"pm-score-seg " + paintClass(s.line.state) + (hover && hover !== s.line.key ? " pm-score-dim" : "")}
                    style={{ animationDelay: `${i * 70}ms` }}
                    onMouseEnter={() => setHover(s.line.key)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            </svg>
            <div className="pm-score-core">
              <div className="text-[54px] font-semibold leading-none text-ink">{score.total}</div>
              <div className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-ink-2">OF 100</div>
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
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">SCORE</p>
          <h1 className="mb-5 mt-1.5 text-[30px] font-bold leading-tight">Supercharge Your Exposure to Buyers</h1>
          <div className="flex flex-wrap gap-x-11 gap-y-3 border-b border-line pb-[18px]" data-testid="score-kpis">
            <Kpi value={score.total} label="SEARCH SCORE" />
            <Kpi value={done.length} label="COMPLETED" />
            <Kpi value={open.length} label="TO DO" />
          </div>
          <p className="my-[18px] text-[14px] leading-[1.65] text-ink-2">{say}</p>
          {next && (
            <div className="flex flex-wrap gap-3">
              <Link href={hrefFor(next)} className={BTN}>
                {SCORE_LINE_COPY[next.key].action} (+{next.points})
              </Link>
              {next.declarable && (
                <button type="button" className={BTN_W} disabled={busy === next.key} onClick={() => declareNone(next.key)}>
                  {busy === next.key ? "Saving…" : "I Have None"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

      <div className="mt-9 grid border-t border-line md:grid-cols-2">
        <section className="py-5 md:pr-7" data-testid="score-todo">
          <H2 title="To Do" note={open.length ? `${open.length} line${open.length === 1 ? "" : "s"} · ${missingPoints} points` : "nothing left"} />
          {open.map((l) => (
            <Row key={l.key} onHover={setHover} lineKey={l.key}>
              <span className="flex items-center">
                <span className="mr-2.5 inline-flex h-[18px] w-[18px] flex-none rounded-full border-2 border-magenta" />
                {l.label}
              </span>
              <span className="flex flex-wrap items-center justify-end gap-x-2 text-[13px]">
                <Link href={hrefFor(l)} className="font-semibold text-magenta-dark hover:underline">
                  {SCORE_LINE_COPY[l.key].action}
                </Link>
                {l.declarable && (
                  <button
                    type="button"
                    onClick={() => declareNone(l.key)}
                    disabled={busy === l.key}
                    className="font-semibold text-magenta-dark hover:underline disabled:opacity-60"
                  >
                    {busy === l.key ? "Saving…" : "I Have None"}
                  </button>
                )}
                <span className="text-ink-2">· +{l.points}</span>
              </span>
            </Row>
          ))}
          <p className="border-t border-line py-2.5 text-[13px] text-ink-2">
            {open.length ? "That's the whole list. Nothing here depends on anyone but you." : "Every line is answered."}
          </p>
        </section>

        <section className="border-t border-line py-5 md:border-l md:border-t-0 md:pl-7" data-testid="score-completed">
          <H2 title="Completed" note={`${score.total} of 100`} />
          {(Object.keys(SCORE_GROUP_LABELS) as ScoreGroup[]).map((g) => {
            const inGroup = score.lines.filter((l) => l.group === g);
            const got = inGroup.filter((l) => lineCounts(l.state));
            if (got.length === 0) return null;
            return (
              <div key={g}>
                <p className="mb-1 mt-3.5 flex justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-magenta">
                  {SCORE_GROUP_LABELS[g]}
                  <b className="text-ink">
                    {got.reduce((a, l) => a + l.points, 0)} / {inGroup.reduce((a, l) => a + l.points, 0)}
                  </b>
                </p>
                {got.map((l) => (
                  <Row key={l.key} onHover={setHover} lineKey={l.key}>
                    <span className="flex items-center">
                      <span className="mr-2.5 inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-ink text-[11px] text-surface">
                        ✓
                      </span>
                      <span>
                        {l.label}
                        {l.state === "declared_none" && <span className="block text-[11px] text-ink-3">{DECLARED_NONE_RIDER}</span>}
                      </span>
                    </span>
                    <span className="text-[13px] text-ink-2">{l.points}</span>
                  </Row>
                ))}
              </div>
            );
          })}
        </section>
      </div>
      <div className="h-[60px]" />
    </div>
  );
}

function Kpi({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <b className="block whitespace-nowrap text-[26px] font-medium">{value}</b>
      <span className="whitespace-nowrap text-[11px] font-semibold tracking-[0.08em] text-ink-2">{label}</span>
    </div>
  );
}

function H2({ title, note }: { title: string; note: string }) {
  return (
    <h2 className="mb-1.5 flex items-baseline justify-between text-[22px] font-bold">
      {title} <small className="text-[12px] font-normal text-ink-3">{note}</small>
    </h2>
  );
}

function Row({
  children,
  lineKey,
  onHover,
}: {
  children: React.ReactNode;
  lineKey: string;
  onHover: (k: string | null) => void;
}) {
  return (
    <div
      data-line={lineKey}
      className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14px]"
      onMouseEnter={() => onHover(lineKey)}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </div>
  );
}

// Both answered states count, so both paint as filled; the class still tells them apart.
function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}
