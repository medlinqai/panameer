import type { ReactNode } from "react";

export function SellSection({
  eyebrow,
  heading,
  body,
  graphic,
  /** Which side the GRAPHIC sits on at desktop. */
  side = "right",
  /** The alternating light band. */
  shaded = false,
  step,
  /** Extra content under the body copy. Used only by the spine's `While you are learning`. */
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  graphic: ReactNode;
  side?: "left" | "right";
  shaded?: boolean;
  step?: number;
  children?: ReactNode;
}) {
  return (
    <section
      className={
        "border-t border-line px-6 py-14 min-[900px]:py-[66px] " +
        (shaded ? "bg-bg-soft" : "bg-white")
      }
    >
      <div className="mx-auto grid max-w-[1136px] items-center gap-8 min-[900px]:grid-cols-2 min-[900px]:gap-11">
        <div className="min-w-0">
          {}
          <p className="mb-2.5 flex items-center gap-[9px] text-[19px] font-extrabold uppercase tracking-[0.14em] text-magenta">
            {step !== undefined ? (
              <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-magenta font-display text-[13px] font-bold normal-case leading-none tracking-normal text-white">
                {step}
              </span>
            ) : null}
            {eyebrow}
          </p>
          <h2 className="text-[27px] font-bold leading-[1.14] tracking-[-0.6px] text-ink min-[900px]:text-[34px]">
            {heading}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16.5px] leading-[1.62] text-ink-2">{body}</p>
          {children}
        </div>
        {/* the graphic moves, the source order does not — see the note above */}
        <div className={"min-w-0" + (side === "left" ? " min-[900px]:order-first" : "")}>
          {graphic}
        </div>
      </div>
    </section>
  );
}
