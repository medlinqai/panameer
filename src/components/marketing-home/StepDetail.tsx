import type { ReactNode } from "react";

export function StepDetail({
  n,
  title,
  lead,
  shade = false,
  wide = false,
  children,
}: {
  n: number;
  title: string;
  lead: ReactNode;
  /** Every other section takes the shaded ground. */
  shade?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={`step-${n}`}
      className={"sd" + (shade ? " sd-shade" : "") + (wide ? " sd-wide" : "")}
    >
      <div className="wrap">
        <div className="sd-head">
          <span className="sd-n" aria-hidden>
            {n}
          </span>
          <div className="sd-headtext">
            {/*
              ⚠ THE NUMERAL IS `aria-hidden` AND REPEATED HERE INSTEAD.
              Rendered as a bare "4" beside the title it would be read as part
              of the heading ("4 You log in and review"), which is how the
              number ends up in the document outline and in a screen reader's
              heading list. The visible glyph is decoration; the accessible
              heading says "Step 4 — You log in and review".
            */}
            <h2>
              <span className="sr-step">Step {n} &mdash; </span>
              {title}
            </h2>
            <p className="sd-lead">{lead}</p>
          </div>
        </div>
        <div className="sd-art">{children}</div>
      </div>
    </section>
  );
}
