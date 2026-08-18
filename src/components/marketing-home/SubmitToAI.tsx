import { P2P_DOMAINS as CAPABILITY_DOMAINS } from "@/lib/capability-domains";

/**
 * STEP 3's GRAPHIC — four processes converge on the AIP, two outputs diverge.
 *
 * A COMPONENT, NOT AN IMAGE. The mockup is HTML/CSS and it stays that way: a PNG
 * would not scale, would not theme, and would freeze the four process names into
 * a bitmap when they are supposed to come from data.
 *
 * ── ⚠ THE LEFT COLUMN IS CAPABILITY DOMAINS, NOT PROCESSES (E143) ────────────
 *
 * It drew from `PROCESSES` when this shipped at 03b4db7, which contradicted the
 * funnel the spine had just walked the reader through: by Step 3 they have
 * ALREADY picked one process back in Step 1. What converges on the AIP is the
 * capability domains INSIDE that process — that is what the assessment asks about
 * and what the AIP scores.
 *
 * ⚠ THE TEN COME FROM `lib/capability-domains.ts`, NOT the question bank.
 * `P2P_DOMAINS` is exported from two files: this one has ten with `name`/`id` and
 * is the list already advertised on `/`; `lib/assessment/questions-p2p.ts` has the
 * EIGHT that are actually assessed, with different wording. This is marketing art,
 * so it takes the ten — aliased on import because the two share a name.
 *
 * Mapped, never hard-coded: an eleventh domain appears here with no edit.
 *
 * ── ⚠ THE CONNECTOR GEOMETRY IS THE HARD PART. READ THIS BEFORE CHANGING IT ──
 *
 * The mockup draws one stretched SVG across the whole funnel at a fixed
 * `viewBox="0 0 1136 300"` with `preserveAspectRatio="none"`, and its paths end
 * at x=400 / 636 / 800. Those numbers are wrong at the mockup's OWN width: with
 * `230px 1fr 240px 1fr 300px` inside 1136px each gap is 183px, so the real card
 * edges are at 413 / 653 / 836 — the curves miss by 13, 17 and 36px. At 1036px
 * (a 1100px viewport) they miss by more, because three of the five columns are
 * fixed pixels and the two flexible ones absorb every change. A single stretched
 * viewBox can only ever be correct at one width.
 *
 * So there is ONE SVG PER GAP instead, each living in its own grid cell:
 *
 *   x = 0   is exactly the left card's right edge
 *   x = 100 is exactly the right card's left edge
 *
 * because the cell IS the gap. That is exact at every width by construction,
 * with no measurement and no magic numbers, and it cannot drift when the column
 * widths change.
 *
 * y is 1:1 because the funnel's height is pinned to `FUNNEL_H` below, which is
 * computed from the same constants the CSS uses. Both axes are therefore derived
 * from one place; if you change `PROC_H`, `PROC_GAP`, `OUT_H` or `OUT_GAP`, change
 * them HERE and the curves follow.
 *
 * ⚠ ARROWHEADS ARE HTML, NOT SVG PATHS. `preserveAspectRatio="none"` stretches
 * the x axis (1.83x at 1136px, 1.33x at 1036px), which would squash a chevron
 * drawn in viewBox units into a different shape at every width. They are
 * absolutely-positioned spans sized in pixels instead, so they are identical
 * everywhere.
 */

/* ── the geometry constants, shared with home.css ─────────────────────────── */
/**
 * ⚠ EVERY ROW HEIGHT HERE IS EXPLICIT, AND THAT IS WHAT MAKES THE CURVES
 * DERIVABLE. The chip stack is rendered with an explicit `grid-template-rows`
 * built from these numbers, so a two-line domain name cannot silently make one
 * chip taller than its neighbours and push every connector off its target. If a
 * name needs more room, raise `CHIP_H` here — the rows, the stack height and all
 * ten curves move together.
 */
const CHIP_H = 34;
const CHIP_GAP = 7;
/** The muted "…capability domains" label above the stack, as its own row. */
const LABEL_H = 14;
/** Output card height, likewise fixed. */
const OUT_H = 96;
const OUT_GAP = 16;

const OUTS_H = 2 * OUT_H + OUT_GAP;

/** Vertical centre of item `i` in a stack of `n`, centred in `FUNNEL_H`. */
const centreOf = (i: number, n: number, h: number, gap: number, funnelH: number) =>
  (funnelH - (n * h + (n - 1) * gap)) / 2 + i * (h + gap) + h / 2;

/**
 * A smooth S from one card edge to the other. Control points sit at x=50 — the
 * midpoint of the gap — so the curve leaves and arrives horizontally, which is
 * what keeps it reading as a flow line rather than a diagonal. Because x is
 * stretched, the S gets gently wider on a wide screen and tighter on a narrow
 * one; the endpoints do not move.
 */
const s = (y1: number, y2: number) => `M0 ${y1} C50 ${y1}, 50 ${y2}, 100 ${y2}`;

function Arrow({ top }: { top: number }) {
  return (
    <span className="fnl-arw" style={{ top: `${top}px` }} aria-hidden>
      <svg viewBox="0 0 10 14" fill="none" aria-hidden focusable="false">
        <path
          d="M2 2 L8 7 L2 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SubmitToAI() {
  const n = CAPABILITY_DOMAINS.length;
  /* label row + its gap + n chip rows + (n-1) gaps between them */
  const procsH = LABEL_H + CHIP_GAP + n * CHIP_H + (n - 1) * CHIP_GAP;
  const FUNNEL_H = Math.max(procsH, OUTS_H);
  /* Where the chip stack starts inside the row, once centred. */
  const stackTop = (FUNNEL_H - procsH) / 2 + LABEL_H + CHIP_GAP;

  const chipY = CAPABILITY_DOMAINS.map(
    (_, i) => stackTop + i * (CHIP_H + CHIP_GAP) + CHIP_H / 2
  );
  const aipY = FUNNEL_H / 2;
  const outY = [0, 1].map((i) => centreOf(i, 2, OUT_H, OUT_GAP, FUNNEL_H));

  return (
    <div
      className="fnl"
      /* One number drives the grid height and both viewBoxes. */
      style={{ ["--fnl-h" as string]: `${FUNNEL_H}px` }}
    >
      <div
        className="fnl-procs"
        /*
          Explicit rows, so no chip can be a different height from its siblings.
          ⚠ PASSED AS A CUSTOM PROPERTY, NOT AS `gridTemplateRows`, AND THAT IS
          DELIBERATE. An inline `grid-template-rows` beats every stylesheet
          selector, so the ten fixed 34px rows could not be released on a phone —
          two-up would have placed ten chips into five of ten rows and left five
          empty 34px rows below them, and `min-height` on a chip locked to a
          34px track just overflows it. home.css reads this var for the desktop
          rows and overrides the PROPERTY at <=900, which the cascade allows.
        */
        style={{ ["--fnl-rows" as string]: `${LABEL_H}px repeat(${n}, ${CHIP_H}px)` }}
      >
        <span className="fnl-domk">Procure-to-Pay capability domains</span>
        {CAPABILITY_DOMAINS.map((d) => (
          <div className="fnl-proc" key={d.id}>
            {d.name}
          </div>
        ))}
      </div>

      {/* ---- gap 1: the ten converging curves -------------------------- */}
      {/* `is-in` thins these only: ten lines at the diverging pair's weight
          read as noise, so the funnel-in strokes drop to 1.4/.6 while the
          two outputs and all three arrowheads keep their weight. */}
      <div className="fnl-link is-in">
        <svg viewBox={`0 0 100 ${FUNNEL_H}`} preserveAspectRatio="none" aria-hidden>
          {chipY.map((y, i) => (
            <path key={i} d={s(y, aipY)} />
          ))}
        </svg>
        <Arrow top={aipY} />
      </div>
      {/*
        ⚠ THE STACKED FLOW MARKER, AND IT IS NOT AN ARROWHEAD. `display:none`
        above 900px; below it the connector cells are gone and there is nothing
        left joining the three groups, which is why the stack stopped reading as a
        funnel and started reading as three unrelated lists. This is a separate
        decorative element rather than a re-pointed connector path: the SVGs are
        `display:none` here, and their arrowheads are placed against a coordinate
        system that no longer exists once the columns collapse.
      */}
      <div className="fnl-gap" aria-hidden>
        <span className="fnl-chev" />
      </div>

      <div className="fnl-aip">
        <p className="fnl-aip-k">Panameer AIP</p>
        <p className="fnl-aip-n">AI Platform</p>
        <p className="fnl-aip-s">
          Scores every capability domain, sizes the dollars, matches the
          solutions.
        </p>
        <div className="fnl-bars">
          {[
            ["Score", 100],
            ["Size", 82],
            ["Match", 64],
          ].map(([label, pct]) => (
            <div className="fnl-bar" key={label as string}>
              <span>{label}</span>
              <i>
                <b style={{ width: `${pct}%` }} />
              </i>
            </div>
          ))}
        </div>
      </div>

      {/* ---- gap 2: the two diverging curves, weight unchanged -------- */}
      <div className="fnl-link">
        <svg viewBox={`0 0 100 ${FUNNEL_H}`} preserveAspectRatio="none" aria-hidden>
          {outY.map((y, i) => (
            <path key={i} d={s(aipY, y)} />
          ))}
        </svg>
        {outY.map((y, i) => (
          <Arrow top={y} key={i} />
        ))}
      </div>
      <div className="fnl-gap" aria-hidden>
        <span className="fnl-chev" />
      </div>

      <div className="fnl-outs">
        {/*
          ⚠ BOTH BADGES ARE LOAD-BEARING. They draw the distinction locked
          2026-08-17: AI can build the dashboard on its own; the roadmap needs the
          client in the room to say what they require and in what order. That is
          the reason the expert call exists rather than being a sales pretext.
          Keep both, and keep the magenta edge on the ROADMAP only.
        */}
        <div className="fnl-out">
          <span className="fnl-badge is-ai">AI builds this</span>
          <span className="fnl-out-h">Optimization Dashboard</span>
          <span className="fnl-out-p">
            Every AI option open to you, scored by domain and sized in dollars.
          </span>
        </div>
        <div className="fnl-out is-road">
          <span className="fnl-badge is-hum">Built with an expert</span>
          <span className="fnl-out-h">Your AI Roadmap</span>
          <span className="fnl-out-p">
            The options you actually require, in priority order.
          </span>
        </div>
      </div>
    </div>
  );
}
