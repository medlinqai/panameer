import { PUNCHOUT_COPY } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

/**
 * "Punch Out for Talent — Not Just Parts" (buyer §4) — the ERP loop.
 *
 * Five steps that alternate between the customer's ERP and Panameer, each
 * badged with where it happens. That alternation IS the content: the claim is
 * that Panameer slots into a procurement process the buyer already runs, and a
 * flat list of five steps would not show the hand-offs.
 *
 * STATIC. Punchout is Phase 2 and nothing here is wired; this section explains
 * a model rather than offering an action, so there is no CTA to be dishonest
 * about.
 *
 * ── ⚠⚠ IT CARRIES ITS OWN `marketing-surface`, AND THAT IS LOAD-BEARING ──────
 *
 * `P1-J0-E333` moved this section from `/integrate` to `/`. ⚠ THE FIRST ATTEMPT
 * MEASURED AS NOT-A-MOVE: 33 property differences across all 37 elements.
 * `/integrate` renders through `MarketingShell`, whose root is
 * `marketing-surface … font-body text-ink` — so THIS SECTION HAS BEEN INHERITING
 * ITS WHOLE ENVIRONMENT FROM AN ANCESTOR. `/` does NOT use `MarketingShell`
 * (`app/page.tsx:61`, deliberate), so outside `.pm-home` it inherits raw `<body>`:
 * Geist, `#171717`. Every body string came out in the wrong face and the wrong
 * colour, and the text REFLOWED — the lede 108px -> 81px.
 *
 * ⚠ SO THE CLASS IS ON THE COMPONENT'S OWN ROOT NOW. This is not a restyle: it
 * REPRODUCES the ancestor it was already relying on. Four things come with it and
 * all four were being inherited before:
 *   · `color: var(--color-ink)`                        globals.css:397
 *   · `--color-ink/-2/-line/-bg-soft` PINNED LIGHT     globals.css:387-391
 *   · the dark-theme white-card undo                   globals.css:399
 *   · `text-wrap: balance` on h1-h4, `pretty` on p/li  globals.css:377-383
 *
 * ⚠⚠ THE TOKEN PINS ARE THE PART THAT WOULD HAVE BITTEN SILENTLY. `bg-[#f6f4fb]`
 * is a HARDCODED LIGHT background, but `border-line`, `bg-ink` and `bg-white`
 * below are THEME-SENSITIVE — under `:root[data-theme="dark"]` (reachable;
 * `src/lib/theme.ts:35` sets it) `--color-ink` flips to `#f2f0f7` and `.bg-white`
 * repaints to `#171128`. On `/integrate` `.marketing-surface` pinned them; without
 * it this section would render near-white ink on a permanently-light card.
 * ⚠ `font-body` IS SEPARATE — `.marketing-surface` sets the tokens and the colour
 * but NOT the face; `MarketingShell` supplies `font-body` alongside it, so this
 * root has to as well.
 * ⚠ DO NOT REMOVE EITHER CLASS to "clean up" a page that happens to supply them.
 *
 * `#punchout` is what `/integrate`'s hero CTA used to resolve to; that anchor was
 * re-homed onto that page's `ErpIntegration` wrapper when this section left.
 */
export function ErpPunchout() {
  return (
    <section
      id="punchout"
      className="marketing-surface bg-[#f6f4fb] py-16 font-body"
    >
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead
          eyebrow={PUNCHOUT_COPY.eyebrow}
          headline={PUNCHOUT_COPY.headline}
          lead={PUNCHOUT_COPY.lead}
        />

        <ol className="relative mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {PUNCHOUT_COPY.steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-[14px] border border-line bg-white px-4 py-5 text-center"
            >
              <span
                className={
                  "mb-3 inline-block rounded-full px-[11px] py-[3px] font-display text-[10px] font-bold uppercase tracking-[0.07em] " +
                  (step.side === "erp"
                    ? "bg-ink text-white"
                    : "bg-magenta text-white")
                }
              >
                {step.where}
              </span>
              <div
                aria-hidden
                className="font-display text-[22px] font-bold leading-none text-[#e3dff0]"
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mb-2 mt-1.5 text-[16px] text-ink">{step.title}</h3>
              <p className="text-[12.5px] leading-[1.45] text-[#3a4266]">
                {step.body}
              </p>

              {/* The hand-off arrow, between cards only, and only when they sit in a row. */}
              {i < PUNCHOUT_COPY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-[13px] top-1/2 hidden h-[26px] w-[26px] -translate-y-1/2 place-items-center rounded-full bg-magenta text-[13px] text-white shadow-[0_5px_12px_rgba(215,44,214,0.35)] lg:grid"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-[30px] max-w-[760px] text-balance text-center font-display text-[18px] font-medium text-ink">
          {/*
            Explicit {" "} on BOTH sides of the <b>. The literal space after
            `</b>` was dropped by the JSX transform and shipped as
            "layerbehind it" — caught in a screenshot, not in review, which is
            why the spaces are written as expressions here rather than trusted
            to survive a line break next to a tag.
          */}
          Your ERP stays the system of record. Panameer is the{" "}
          <b className="text-magenta">services procurement layer</b>{" "}
          behind it — every engagement on-contract, PO&apos;d, and auditable.
        </p>
      </div>
    </section>
  );
}
