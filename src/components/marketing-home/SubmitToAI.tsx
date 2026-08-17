import { PROCESSES } from "@/lib/processes";

/**
 * STEP 3's GRAPHIC — four processes converge on the AIP, two outputs diverge.
 *
 * A COMPONENT, NOT AN IMAGE. The mockup is HTML/CSS and it stays that way: a PNG
 * would not scale, would not theme, and would freeze the four process names into
 * a bitmap when they are supposed to come from data.
 *
 * ── THE PROCESS BUTTONS COME FROM `PROCESSES` ────────────────────────────────
 *
 * Same list the Step 1 cards use, in the data's order — not the mockup's, which
 * was Scott sketching. A fifth process appears here automatically, which is the
 * entire reason that list exists. Verified behaviourally: a temporary fifth entry
 * showed up in this graphic with zero JSX and zero CSS changes.
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
/** Process button height. Fixed so the connector y-positions are derivable. */
const PROC_H = 48;
const PROC_GAP = 14;
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
  const n = PROCESSES.length;
  const procsH = n * PROC_H + (n - 1) * PROC_GAP;
  /* The funnel is as tall as its tallest column, and the AIP is shorter than
     both stacks at every count from four up — verified by measurement. */
  const FUNNEL_H = Math.max(procsH, OUTS_H);

  const procY = PROCESSES.map((_, i) =>
    centreOf(i, n, PROC_H, PROC_GAP, FUNNEL_H)
  );
  const aipY = FUNNEL_H / 2;
  const outY = [0, 1].map((i) => centreOf(i, 2, OUT_H, OUT_GAP, FUNNEL_H));

  return (
    <div
      className="fnl"
      /* One number drives the grid height and both viewBoxes. */
      style={{ ["--fnl-h" as string]: `${FUNNEL_H}px` }}
    >
      <div className="fnl-procs">
        {PROCESSES.map((p) => (
          <div className="fnl-proc" key={p.key}>
            {p.name}
          </div>
        ))}
      </div>

      {/* ---- gap 1: the four converging curves ------------------------- */}
      <div className="fnl-link">
        <svg viewBox={`0 0 100 ${FUNNEL_H}`} preserveAspectRatio="none" aria-hidden>
          {procY.map((y, i) => (
            <path key={i} d={s(y, aipY)} />
          ))}
        </svg>
        <Arrow top={aipY} />
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

      {/* ---- gap 2: the two diverging curves --------------------------- */}
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
