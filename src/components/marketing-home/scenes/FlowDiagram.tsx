"use client";

import { useId, type ReactNode } from "react";
import { isRun, type FlowConnector, type FlowSpec } from "@/lib/marketing-scenes";

/* ── THE FRAME — identical coordinates in both scenes ──────────────────────── */

const CANVAS_W = 1080;
const TOP = 40;

/** The two actor columns. Full height, so every connector has an edge to land on. */
const ACTOR_L = { x: 24, w: 120 };
const ACTOR_R = { x: 936, w: 120 };
const COL_R = 16;

const ORACLE = { x: 196, w: 272, r: 18 };
const PANEL = { x: 560, w: 336, r: 18 };
/** Document chips. x and width fixed, so every chip lines up across both scenes. */
const DOC = { x: 226, w: 212, r: 10, cx: 332 };
/** Step chips. Height fixed too — the panel reads as a stack, not a ladder. */
const STEP = { x: 576, w: 304, h: 30, r: 7, cx: 728 };
const PANEL_EDGE = { left: PANEL.x, right: PANEL.x + PANEL.w };

const NAVY = "#2f3a5c";
const NAVY_CHIP = "#3c4668";
const MAGENTA = "#D72CD6";
const CHIP_TEXT = "#1d2440";
const COL_FILL = "#f7f9fc";
const COL_STROKE = "#c9d1e0";

function stubFor(c: FlowConnector): { y: number; from: number; to: number } | null {
  if (isRun(c)) {
    if (c.kind !== "mag") return null;
    if (c.to === PANEL_EDGE.left) return { y: c.y, from: PANEL_EDGE.left, to: STEP.x };
    if (c.to === PANEL_EDGE.right) return { y: c.y, from: PANEL_EDGE.right, to: STEP.x + STEP.w };
    if (c.from === PANEL_EDGE.left) return { y: c.y, from: STEP.x, to: PANEL_EDGE.left };
    if (c.from === PANEL_EDGE.right) return { y: c.y, from: STEP.x + STEP.w, to: PANEL_EDGE.right };
    return null;
  }
  const m = /^M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(c.d);
  if (!m || c.kind !== "mag") return null;
  const [x, y] = [Number(m[1]), Number(m[2])];
  if (x === PANEL_EDGE.left) return { y, from: STEP.x, to: PANEL_EDGE.left };
  if (x === PANEL_EDGE.right) return { y, from: STEP.x + STEP.w, to: PANEL_EDGE.right };
  return null;
}

function ActorColumn({
  x,
  w,
  h,
  cy,
  lines,
}: {
  x: number;
  w: number;
  h: number;
  cy: number;
  lines: readonly [string, string];
}) {
  const cx = x + w / 2;
  return (
    <g>
      <rect
        x={x}
        y={TOP}
        width={w}
        height={h}
        rx={COL_R}
        fill={COL_FILL}
        stroke={COL_STROKE}
        strokeWidth="1.5"
      />
      <circle cx={cx} cy={cy} r="17" fill="none" stroke={NAVY} strokeWidth="2.2" />
      <path
        d={`M${cx - 21} ${cy + 32}a21 21 0 0 1 42 0`}
        fill="none"
        stroke={NAVY}
        strokeWidth="2.2"
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={cx}
          y={cy + 62 + i * 15}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          letterSpacing=".7"
          fill={NAVY}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function FlowDiagram({ title, spec }: { title: string; spec: FlowSpec }) {
  /*
    Sanitised because React 18 returns `:r0:` and React 19 `«r0»`; neither set of
    delimiters belongs inside `url(#…)`. Stripping them keeps the value unique —
    instances differ in the alphanumeric core, not the wrapper.
  */
  const uid = `fd${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const gradId = `${uid}-panel`;
  const titleId = `${uid}-title`;
  /*
    THREE ARROWHEADS, ALL NAMESPACED PER INSTANCE (§13). `white` is for the
    VERTICAL step-to-step connectors only — see the note where they are drawn.
  */
  const mk = { mag: `${uid}-mag`, navy: `${uid}-navy`, white: `${uid}-white` };
  const headFor: Record<string, string> = { mag: mk.mag, navy: mk.navy, note: mk.navy };

  const h = spec.containerH;

  return (
    <svg
      className="flw-svg"
      viewBox={`0 0 ${CANVAS_W} ${spec.canvasH}`}
      width={CANVAS_W}
      height={spec.canvasH}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>

      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241640" />
          <stop offset="0.55" stopColor="#6d1b6b" />
          <stop offset="1" stopColor={MAGENTA} />
        </linearGradient>
        {(
          [
            [mk.mag, MAGENTA],
            [mk.navy, NAVY],
            [mk.white, "#ffffff"],
          ] as const
        ).map(([id, fill]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" fill={fill} />
          </marker>
        ))}
      </defs>

      {/* ── the four columns ──────────────────────────────────────────────── */}
      <ActorColumn
        x={ACTOR_L.x}
        w={ACTOR_L.w}
        h={h}
        cy={spec.actorCy}
        lines={["SERVICE", "REQUESTER"]}
      />
      <ActorColumn
        x={ACTOR_R.x}
        w={ACTOR_R.w}
        h={h}
        cy={spec.actorCy}
        lines={["SERVICE", "PROVIDER"]}
      />

      <rect
        x={ORACLE.x}
        y={TOP}
        width={ORACLE.w}
        height={h}
        rx={ORACLE.r}
        fill="#ffffff"
        stroke={NAVY}
        strokeWidth="2"
      />
      <rect x="214" y="56" width="152" height="26" rx="7" fill="#f2f5fb" stroke={COL_STROKE} />
      {/* ⚠ TEXT, NOT ORACLE'S LOGO. Trademark uncleared — see ErpIntegration. */}
      <text x="227" y="74" fontSize="10" fontWeight="800" letterSpacing="1" fill={NAVY}>
        ORACLE CLOUD ERP
      </text>

      <rect
        x={PANEL.x}
        y={TOP}
        width={PANEL.w}
        height={h}
        rx={PANEL.r}
        fill={`url(#${gradId})`}
      />
      <text x="578" y="76" fontSize="15" fontWeight="700" fill="#ffffff">
        Panameer
      </text>

      {/* ── Oracle document chips ─────────────────────────────────────────── */}
      {spec.docs.map((doc) => {
        const mid = doc.y + doc.h / 2;
        /*
          A RULED CHIP IS TWO DOCUMENTS IN ONE BOX, so each row centres in its own
          half rather than straddling the chip's centre. That is why the two
          two-line cases use different offsets — it is not an inconsistency.
        */
        const rows =
          doc.lines.length === 1
            ? [mid + 5]
            : doc.rule
              ? [mid - 11, mid + 26]
              : [mid - 4, mid + 13];
        return (
          <g key={doc.lines.join(" ")}>
            <rect x={DOC.x} y={doc.y} width={DOC.w} height={doc.h} rx={DOC.r} fill={NAVY_CHIP} />
            {doc.rule && (
              <path
                d={`M${DOC.x + 16} ${mid} H${DOC.x + DOC.w - 16}`}
                stroke="#69718c"
                strokeWidth="1"
              />
            )}
            {doc.lines.map((line, r) => (
              <text
                key={line}
                x={DOC.cx}
                y={rows[r]}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="#ffffff"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {spec.spine && (
        <path d={spec.spine} stroke={NAVY} strokeWidth="1.6" strokeDasharray="5 5" fill="none" />
      )}

      {/* ── Panameer step chips ───────────────────────────────────────────── */}
      {spec.steps.map((step) => (
        <g key={`${step.actor} ${step.label}`}>
          <rect x={STEP.x} y={step.y} width={STEP.w} height={STEP.h} rx={STEP.r} fill="#ffffff" />
          {/*
            ⚠ ONE <text>, TWO <tspan>s, STILL CENTRED (E112). Actor bold, verb
            regular. They share one text element so the pair centres AS A UNIT —
            two elements would each centre on their own and the sentence would
            come apart.

            The deck right-aligned provider actions and left-aligned requester
            ones, so alignment was carrying the actor. Naming it replaces that
            idea entirely: the labels stay centred, and no legend is needed.
          */}
          <text
            x={STEP.cx}
            y={step.y + 20}
            textAnchor="middle"
            fontSize="12.5"
            fill={CHIP_TEXT}
          >
            <tspan fontWeight="800">{step.actor}</tspan>
            <tspan fontWeight="500"> {step.label}</tspan>
          </text>
        </g>
      ))}

      {/*
        ⚠ VERTICAL WHITE CONNECTORS CARRY A HEAD. HORIZONTAL STUBS DO NOT.

        This is not a contradiction of "white lines, no arrow heads" — it is the
        distinction that rule was about:

          vertical, step -> step   HEAD. It is the only thing asserting sequence
                                   inside the panel; it means "then this".
          horizontal, edge -> chip NO HEAD. It is the last 16px of a magenta
                                   crossing that already placed its arrowhead at
                                   the panel edge. Two heads on one journey.

        Stroke 2, not 1.6: against the near-black top of the gradient a 1.6px
        white line is nearly invisible.

        Drawn only where `follows` is set — see the rule on `FlowStep`, which is
        about where the input CAME FROM, not about spacing.
      */}
      {spec.steps.map((step, i) => {
        const prev = spec.steps[i - 1];
        if (!step.follows || !prev) return null;
        return (
          <path
            key={`${step.label}-follows`}
            d={`M${STEP.cx} ${prev.y + STEP.h} V${step.y}`}
            stroke="#ffffff"
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#${mk.white})`}
          />
        );
      })}

      {/* ── the connectors ────────────────────────────────────────────────── */}
      {spec.connectors.map((c) => {
        const d = isRun(c) ? `M${c.from} ${c.y} H${c.to}` : c.d;
        return (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={c.kind === "mag" ? MAGENTA : NAVY}
            strokeWidth="2"
            strokeLinejoin="round"
            // `note` is a notification, not a transaction. Only Settlement has one.
            strokeDasharray={c.kind === "note" ? "6 5" : undefined}
            markerEnd={`url(#${headFor[c.kind]})`}
          />
        );
      })}

      {/*
        ⚠ THE LAST 16px, IN WHITE, WITH NO ARROWHEAD (E111).
        Derived from the magenta it finishes — see `stubFor`. Drawn last so it
        sits over the panel edge rather than under it, and white because it is
        the one colour that reads against every stop of the gradient.
      */}
      {spec.connectors.map((c) => {
        const s = stubFor(c);
        if (!s) return null;
        return (
          <path
            key={`stub-${s.from}-${s.to}-${s.y}`}
            d={`M${s.from} ${s.y} H${s.to}`}
            stroke="#ffffff"
            strokeWidth="2"
            fill="none"
          />
        );
      })}
    </svg>
  );
}

/**
 * The scene shell both flows share: heading, sub, the diagram, the closing note.
 *
 * The note is the argument in both cases — a dozen arrows look like a lot of
 * process until the note points out the buyer only acts twice — so it is part of
 * the scene rather than something the card carries.
 */
export function FlowScene({
  title,
  sub,
  spec,
  note,
}: {
  title: string;
  sub: string;
  spec: FlowSpec;
  note: ReactNode;
}) {
  return (
    <div className="scene flw">
      <h2 className="flw-h2">{title}</h2>
      <div className="flw-sub">{sub}</div>
      <FlowDiagram title={title} spec={spec} />
      <p className="flw-note">{note}</p>
    </div>
  );
}
