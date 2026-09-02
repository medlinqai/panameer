import Link from "next/link";

/**
 * THE REFUSAL IS THE PRODUCT (`P1-ALL-E034` WS-4).
 *
 * **SCOTT:** *"i did struggle with not being direct about the data i wanted and
 * why the platform wanted that data."*
 *
 * ⚠⚠ ONE LINE PER MISSING FIELD, NAMING THE FIELD, SAYING WHAT BREAKS FOR THE
 * MEMBER, LINKING STRAIGHT TO IT. Never *"complete your profile"*, never a
 * percentage, never a progress bar as the reason — `check:transaction-gates`
 * fails the build on the first of those and `access.ts:337` already argued the
 * other two: *"an indirect gate is how 'I answered everything and I'm still
 * invisible' happens — the arithmetic is silent."*
 *
 * ⚠ IT IS SHOWN BEFORE THE BLOCK, NOT AFTER THE CLICK, wherever the surface can
 * know. Learning what you owe by being refused is the worst version of this.
 *
 * ⚠ NOT STYLED AS AN ERROR. Nothing has gone wrong; some fields are not filled
 * in. Red would read as a fault and this is not one.
 *
 * ⚠⚠ THE CALLER DISABLES ITS OWN CONTROL AND KEEPS IT VISIBLE — never
 * `pointer-events: none`, never hidden. That is the `E306` rule: a keyboard user
 * must be able to tab to this explanation and to every link in it, which a
 * pointer-events trap denies them. A missing control reads as broken; a control
 * that says why reads as a next step.
 *
 * ONE COMPONENT FOR EVERY RUNG. `IDENTITY`, `LEARN`, `SEARCHABLE` and `SELL` all
 * return the same `GateGap[]`, so a second notice would only be a second place
 * for the wording to drift.
 */
export type GateNoticeGap = {
  key: string;
  field: string;
  reason: string;
  href: string;
};

export function GateNotice({
  gaps,
  heading,
  lede,
  className = "",
}: {
  gaps: GateNoticeGap[];
  heading: string;
  /** One sentence of context. Optional — the rows carry the substance. */
  lede?: string;
  className?: string;
}) {
  if (gaps.length === 0) return null;
  return (
    <div className={`rounded-brand border border-line bg-bg-soft p-4 ${className}`}>
      <p className="text-[14px] font-bold">{heading}</p>
      {lede && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{lede}</p>
      )}
      <ul className="mt-2.5 grid gap-2">
        {gaps.map((g) => (
          <li key={g.key} className="text-[13.5px] leading-relaxed">
            <Link href={g.href} className="font-bold text-magenta hover:underline">
              {g.field}
            </Link>{" "}
            <span className="text-ink-2">— {g.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
