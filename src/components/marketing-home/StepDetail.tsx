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
            {/* THE NUMERAL IS `aria-hidden` AND REPEATED HERE INSTEAD. */}
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
