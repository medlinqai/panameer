"use client";

import { useId, type ReactNode } from "react";
import type { FlowSpec } from "@/lib/marketing-scenes";

/**
 * THE FOUR-COLUMN FLOW DIAGRAM — one primitive, both ERP scenes.
 *
 * Ported from 2. Claude Sub-Files/mockups/erp_integration_section.html, which is
 * the spec for geometry, colour and content. Replaces the swimlane form shipped
 * in e99b98c: swimlanes flattened a diagram whose whole point is WHICH OF FOUR
 * PARTIES holds the document at each moment, and dropped the two containers that
 * make "two systems, talking" legible before you read a word.
 *
 * ── ONE PRIMITIVE, NOT TWO COPIES ────────────────────────────────────────────
 *
 * Fulfillment and Settlement differ only in chips, steps and arrows. The frame —
 * the Oracle box, the Panameer panel, both actors, the gradient, the markers —
 * is identical, and identical-by-copy is how two diagrams drift until a reader
 * can no longer compare them. Everything below the FRAME section is layout only:
 * the content lives in `marketing-scenes.ts`.
 *
 * ── ⚠ MARKER IDS ARE NAMESPACED PER INSTANCE, AND THEY HAVE TO BE ────────────
 *
 * SVG `marker-end="url(#am)"` resolves against the WHOLE DOCUMENT and takes the
 * first match. This page renders these scenes three times at once — a crop
 * inside each of the two cards, plus the open dialog — so with a fixed id every
 * arrowhead on the page would point at whichever `<defs>` happened to parse
 * first. Close that dialog and the referenced node is gone.
 *
 * `useId()` gives each React instance its own suffix, so a scene can only ever
 * reference its own markers. It is sanitised because React's raw value contains
 * delimiter characters (`:` in React 18, `«»` in 19) that have no business in a
 * FuncIRI. Asserted in `check:ui` §13.
 *
 * ── ⚠ PURE SVG, AND KEEP IT THAT WAY ─────────────────────────────────────────
 *
 * No <a>, no <foreignObject>, no control of any kind. These render inside a card
 * <button>, and an interactive descendant of a button is E097 all over again.
 */

/* ── THE FRAME — shared by both scenes, identical coordinates ─────────────── */

const VB = { w: 1080, h: 578 };
const ORACLE = { x: 150, y: 40, w: 290, h: 505, r: 18 };
const PANEL = { x: 545, y: 40, w: 330, h: 505, r: 18 };
/** Document chips: x and width fixed, so every chip lines up in both scenes. */
const DOC = { x: 205, w: 180, r: 10, cx: 295 };
/** Step chips: height is fixed too — the panel reads as a stack, not a ladder. */
const STEP = { x: 560, w: 300, h: 30, r: 7, cx: 710 };
/** The gutter between two CONSECUTIVE steps. Wider than this is a group break. */
const STEP_GUTTER = 8;
const ACTOR_CY = 284;

const NAVY = "#2f3a5c";
const NAVY_CHIP = "#3c4668";
const MAGENTA = "#D72CD6";
const CHIP_TEXT = "#1d2440";

/** Head plus shoulders. Decorative — the label underneath carries the meaning. */
function Actor({ cx, label }: { cx: number; label: string }) {
  return (
    <g>
      <circle cx={cx} cy={ACTOR_CY} r="20" fill="none" stroke={NAVY} strokeWidth="2.4" />
      <path
        d={`M${cx - 32} 352 a32 32 0 0 1 64 0`}
        fill="none"
        stroke={NAVY}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <text x={cx} y="380" textAnchor="middle" fontSize="13" fontWeight="600" fill={CHIP_TEXT}>
        {label}
      </text>
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
  /** Arrowheads: magenta crossing, navy internal, small white between steps. */
  const mk = { mag: `${uid}-mag`, navy: `${uid}-navy`, white: `${uid}-white` };
  const headFor: Record<string, string> = { mag: mk.mag, navy: mk.navy, note: mk.navy };

  return (
    <svg
      className="flw-svg"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width={VB.w}
      height={VB.h}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>

      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#241640" />
          <stop offset="0.55" stopColor="#6d1b6b" />
          <stop offset="1" stopColor={MAGENTA} />
        </linearGradient>
        {(
          [
            [mk.mag, MAGENTA, 7],
            [mk.navy, NAVY, 7],
            [mk.white, "#ffffff", 6],
          ] as const
        ).map(([id, fill, size]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth={size}
            markerHeight={size}
            orient="auto-start-reverse"
          >
            <path d="M0 1 L9 5 L0 9 z" fill={fill} />
          </marker>
        ))}
      </defs>

      {/*
        ── the two containers ─────────────────────────────────────────────────
        ⚠ SPELL OUT width/height/rx. These were first written as `{...ORACLE}`
        with the shorthand `w`/`h`/`r` keys, and SVG has no such attributes: the
        rects rendered at zero size, so the Oracle outline and the whole magenta
        panel silently vanished and the white step chips went white-on-white.
        Nothing errored — it just drew an empty diagram.
      */}
      <rect
        x={ORACLE.x}
        y={ORACLE.y}
        width={ORACLE.w}
        height={ORACLE.h}
        rx={ORACLE.r}
        fill="#ffffff"
        stroke={NAVY}
        strokeWidth="2"
      />
      <rect x="170" y="56" width="152" height="26" rx="7" fill="#f2f5fb" stroke="#c9d1e0" />
      <text
        x="246"
        y="74"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="800"
        letterSpacing="1.1"
        fill={NAVY}
      >
        {/* ⚠ TEXT, NOT ORACLE'S LOGO. Trademark is uncleared — see ErpIntegration. */}
        ORACLE CLOUD ERP
      </text>
      <rect
        x={PANEL.x}
        y={PANEL.y}
        width={PANEL.w}
        height={PANEL.h}
        rx={PANEL.r}
        fill={`url(#${gradId})`}
      />
      <text x="567" y="76" fontSize="16.5" fontWeight="700" fill="#ffffff" letterSpacing="-.2">
        Panameer
      </text>

      <Actor cx={70} label="Service Requester" />
      <Actor cx={1005} label="Service Provider" />

      {/* ── Oracle document chips ─────────────────────────────────────────── */}
      {spec.docs.map((doc) => {
        const mid = doc.y + doc.h / 2;
        // One line sits just below centre; two straddle it.
        const rows = doc.lines.length === 1 ? [mid + 5] : [mid - 5, mid + 15];
        return (
          <g key={doc.lines.join(" ")}>
            <rect x={DOC.x} y={doc.y} width={DOC.w} height={doc.h} rx={DOC.r} fill={NAVY_CHIP} />
            {doc.rule && (
              <path
                d={`M${DOC.x + 16} ${mid} H${DOC.x + DOC.w - 16}`}
                stroke="rgba(255,255,255,.28)"
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

      {/*
        The lineage inside the ERP — requisition became agreement became order.
        Dashed and HEADLESS on purpose: it states provenance, it is not a
        hand-off, and giving it an arrowhead would make it read as one.
      */}
      {spec.spine && (
        <path d={spec.spine} stroke={NAVY} strokeWidth="1.8" strokeDasharray="5 5" fill="none" />
      )}

      {/* ── Panameer step chips ───────────────────────────────────────────── */}
      {spec.steps.map((step) => (
        <g key={step.label}>
          <rect x={STEP.x} y={step.y} width={STEP.w} height={STEP.h} rx={STEP.r} fill="#ffffff" />
          <text
            x={STEP.cx}
            y={step.y + 19.5}
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="600"
            fill={CHIP_TEXT}
          >
            {step.label}
          </text>
        </g>
      ))}

      {/*
        ⚠ DERIVED, NOT LISTED. A little white arrow appears only where the next
        chip is exactly one gutter below — which IS the definition of
        "consecutive". The wider gaps are the group breaks (bid / work order /
        release), and a break is a pause, not a hand-off. Deriving it means
        re-spacing a group cannot leave a stale arrow pointing across a gap.
      */}
      {spec.steps.map((step, i) => {
        const next = spec.steps[i + 1];
        if (!next || next.y - (step.y + STEP.h) !== STEP_GUTTER) return null;
        return (
          <path
            key={`${step.label}-arrow`}
            d={`M${STEP.cx} ${step.y + STEP.h} V${next.y - 1}`}
            stroke="#ffffff"
            strokeWidth="2"
            markerEnd={`url(#${mk.white})`}
          />
        );
      })}

      {/* ── the connectors ────────────────────────────────────────────────── */}
      {spec.connectors.map((c) => (
        <path
          key={c.d}
          d={c.d}
          fill="none"
          stroke={c.kind === "mag" ? MAGENTA : NAVY}
          strokeWidth="2"
          strokeLinejoin="round"
          // `note` is a notification, not a transaction. Only Settlement has one.
          strokeDasharray={c.kind === "note" ? "6 5" : undefined}
          markerEnd={`url(#${headFor[c.kind]})`}
        />
      ))}
    </svg>
  );
}

/**
 * The scene shell both flows share: heading, sub, the diagram, the closing note.
 *
 * The note is the argument in both cases — eight hand-offs look like a lot of
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
