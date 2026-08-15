import { Fragment } from "react";
import type { Lane } from "@/lib/marketing-scenes";

/**
 * THE SWIMLANE FLOW — the shared body of the two ERP-integration scenes.
 *
 * ── WHY ONE RENDERER AND NOT TWO COPIES ──────────────────────────────────────
 *
 * Fulfillment and Settlement are the same drawing with different rows. Writing
 * the lane markup twice would mean a spacing or node-style fix landing on one
 * flow and not the other, and the two sit behind adjacent cards where that
 * would be obvious. The scenes stay separate files because they are separate
 * content; only the rendering is shared.
 *
 * ── ⚠ NOTHING HERE IS INTERACTIVE, AND THAT IS LOAD-BEARING ──────────────────
 *
 * Every node is a <span>. These scenes render TWICE — once clipped inside a
 * card <button>, once live in the dialog — and HTML forbids an interactive
 * descendant of a button. That is E097, and it is why `scenes/decorative.ts`
 * exists. This flow has no control to guard in the first place, which is the
 * better position to be in: there is nothing here that can regress.
 *
 * ── STILL PRESENTATIONAL ─────────────────────────────────────────────────────
 *
 * A Phase 2 capability. No CTA, no "live" badge, nothing wired — matching
 * `ErpPunchout.tsx`'s posture: this explains a model rather than offering an
 * action, so there is no action to be dishonest about.
 */
export function SwimlaneFlow({
  title,
  sub,
  lanes,
  note,
}: {
  title: string;
  sub: string;
  lanes: readonly Lane[];
  /** The closing paragraph, pre-composed so it can carry its lead-in <b>. */
  note: React.ReactNode;
}) {
  return (
    <div className="scene flw">
      <h2 className="flw-h2">{title}</h2>
      <div className="flw-sub">{sub}</div>

      {lanes.map((lane, i) => (
        /*
          Keyed by index, deliberately. An actor recurs — Fulfillment has three
          separate Oracle lanes — so `who` is not unique, and the ORDER is the
          content: these rows never reorder, filter or animate.
        */
        <div className="flw-lane" key={i}>
          <div className="flw-who">{lane.who}</div>
          <div className="flw-chain">
            {lane.steps.map((step, s) => (
              /*
                A Fragment, not a wrapper <span>: `.flw-chain` is the flex row
                and its gap has to apply between the arrow and the nodes. A
                wrapper would make each step+arrow one flex item and the
                spacing would come out wrong on the wrapped rows.
              */
              <Fragment key={step}>
                {/* Chrome between two steps, never before the first. */}
                {s > 0 && (
                  <span className="flw-arw" aria-hidden>
                    →
                  </span>
                )}
                <span className={`flw-node ${lane.kind}`}>{step}</span>
              </Fragment>
            ))}
          </div>
        </div>
      ))}

      <p className="flw-note">{note}</p>
    </div>
  );
}
