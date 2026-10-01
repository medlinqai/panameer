import { FREE_AS_OF_LINE } from "@/lib/free-as-of";

/**
 * ── ⚠⚠⚠ THE LEAD LINE (`P2-A1.1-E737`, brief_free_first WS-A) ───────────────────────────
 *
 * ⚠ **SCOTT: *"we should focus on letting our users do for free what they have to pay to do
 * on linkedin… we should lead with this in every section."*** One quiet line directly under
 * each section's page header. Ink text, the date in grey, no box, no icon.
 *
 * ── ⚠⚠ THE FOUR RULES, ENFORCED BY THE SHAPE RATHER THAN BY REMEMBERING ─────────────────
 *
 * 1. ⚠ **GENERIC, NEVER NAMED.** *"Other professional networks"* — no competitor is named
 *    anywhere in the app. The `compare` prop carries that half of the sentence and is
 *    optional, because not every line has a comparison worth making.
 * 2. ⚠⚠ **EVERY LINE CARRIES ITS "AS OF" DATE, AND IT IS NOT A PROP.** It comes from
 *    `FREE_AS_OF_LINE` and nowhere else (`E585`), so updating it is one edit in one file.
 *    ⚠⚠⚠ **A CALLER CANNOT OVERRIDE IT OR FORGET IT** — that is the whole reason this is a
 *    component rather than a snippet of JSX copied five times.
 * 3. ⚠ **NO ABSOLUTES.** No *"never"*, *"always"*, *"unlimited"* or *"anyone"*. Scott's
 *    standing rule, and two existing strings already broke it before `E734` fixed them.
 * 4. ⚠⚠⚠ **ONLY CLAIM WHAT THE APP DOES TODAY.** This component cannot enforce that — it
 *    is a rendering decision made by whoever mounts it. ⚠ **TWO OF THE FIVE LINES DO NOT
 *    SHIP FOR EXACTLY THIS REASON**: Shop waits until `/shop` is a real page rather than a
 *    `ComingSoon` stub, and the Connect line moved to `/community` because `/connect` is a
 *    pure `redirect()` where a line would never render.
 */
export function FreeLine({
  claim,
  compare,
}: {
  /** ⚠ The bold half — what is free. A sentence, ending in a full stop. */
  claim: string;
  /** ⚠ The quiet half — what other networks do. Optional, never names one. */
  compare?: string;
}) {
  return (
    <p className="mt-1 text-[13.5px] leading-relaxed text-ink">
      <strong className="font-semibold">{claim}</strong>
      {compare ? <span className="text-ink-2"> {compare}</span> : null}{" "}
      {/* ⚠ Grey, and quieter than the claim: it is a qualification, not a feature. */}
      <span className="text-ink-3">{FREE_AS_OF_LINE}</span>
    </p>
  );
}
