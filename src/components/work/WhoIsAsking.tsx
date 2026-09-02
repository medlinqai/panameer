import { BadgeCheck, CircleDashed } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { standingLine, type BuyerIdentity } from "@/lib/work-request-identity";

/**
 * WHO'S ASKING — the identity block on a work request (`P1-J4-E025`).
 *
 * **SCOTT, 2026-09-02:** *"WORK REQUEST NEEDS MORE. I SEE THEIR REQUEST… WANT TO
 * SEE WHO THEY ARE JUST LIKE I WOULD IN LINKEDIN… AND THERE IS ONLY A TITLE?
 * LOOKS LIKE A SCAM FOR A SITE I DO NOT KNOW WELL."*
 *
 * ── ⚠ THE LAYOUT IS A PROPOSAL, AND HERE IS WHY IT IS THIS ONE ───────────────
 *
 * The brief listed what the block must SAY and told me to propose how it looks.
 * Four rows, always in this order, always the same shape whatever the data:
 *
 *   1  PERSON      photo · name · job title
 *   2  COMPANY     logo · name (or code name) · country · industry
 *   3  STANDING    member since · how many requests posted
 *   4  VERIFIED    one row per check, each with its own state and qualifier
 *
 * ⚠ THE ORDER IS THE ARGUMENT. A provider asks "is there a human here", then
 * "which company", then "have they done this before", then "what has anyone
 * actually checked". Putting verification last is deliberate: it qualifies
 * everything above it, and a badge at the top would be read as a summary
 * verdict on the whole block, which it is not.
 *
 * ⚠ IT IS ONE COLUMN AND SELF-CONTAINED. It renders inside a feed card today
 * and will drop unchanged into a work-request detail page when one exists —
 * which is why it takes a `BuyerIdentity` and reads nothing else.
 *
 * ── ⚠⚠ NO INVENTED SIGNALS. WHAT IS DELIBERATELY NOT HERE ────────────────────
 *
 * No trust score, no stars, no percentage, no "highly rated buyer", no green
 * "trusted" chip. ⚠ AND NO AWARD COUNT — the brief asks for one and there is no
 * `Proposal`, `WorkOrder`, `Award` or `Contract` model to derive it from, so it
 * is absent rather than fabricated. Reported at `E025`.
 *
 * ⚠ A FIRST-TIME POSTER IS STATED FLATLY as "First work request" — no pill, no
 * amber, no caution icon. Scott: honest, and not a warning.
 */
export function WhoIsAsking({ identity }: { identity: BuyerIdentity }) {
  const {
    personName,
    personFirstName,
    personLastName,
    personTitle,
    personPhotoUrl,
    companyName,
    companyCodeName,
    companyConfidential,
    companyCountry,
    companyVertical,
    companyLogoUrl,
    standing,
    verification,
  } = identity;

  /*
    ⚠ A CONFIDENTIAL REQUEST STILL NAMES SOMETHING. The code name when the buyer
    set one, and a plain statement of the fact when they did not — never a blank,
    which reads as missing data rather than as a decision.
  */
  const companyLabel = companyConfidential
    ? (companyCodeName ?? "Company withheld")
    : companyName;

  const companyMeta = [companyVertical, companyCountry].filter(Boolean).join(" · ");

  return (
    <section
      aria-label="Who's asking"
      className="rounded-[12px] border border-line bg-bg-soft p-4"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
        Who&rsquo;s Asking
      </p>

      {/* 1 — the person */}
      <div className="flex items-center gap-3">
        <Avatar firstName={personFirstName} lastName={personLastName} photoUrl={personPhotoUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{personName ?? "—"}</p>
          {personTitle && (
            <p className="truncate text-[12.5px] text-ink-2">{personTitle}</p>
          )}
        </div>
      </div>

      {/* 2 — the company */}
      <div className="mt-3 flex items-center gap-2.5">
        {companyLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyLogoUrl}
            alt=""
            className="h-6 w-6 shrink-0 rounded-[5px] object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">
            {companyLabel ?? "—"}
          </p>
          {/*
            ⚠ ITS OWN LINE, NOT A SUFFIX. Measured at 1440: inside this 260px
            column `A global energy company — hiring confidentially` truncated to
            `A global energy company — hi…`, which loses the entire point of the
            note — a provider reading a code name needs to be told it IS a code
            name. Caught in a screenshot, not by a scrollWidth check: nothing
            overflowed, the text was simply cut.
          */}
          {companyConfidential && (
            <p className="text-[12.5px] leading-snug text-ink-2">
              Hiring confidentially
            </p>
          )}
          {companyMeta && (
            <p className="truncate text-[12.5px] text-ink-2">{companyMeta}</p>
          )}
        </div>
      </div>

      {/* 3 — standing */}
      <p className="mt-3 text-[12.5px] text-ink-2">{standingLine(standing)}</p>

      {/*
        ── ⚠⚠ 4 — VERIFICATION. ONE LOOP, BOTH STATES ──────────────────────────

        ⚠ THE NEGATIVE IS RENDERED, NOT OMITTED. Scott's rule, 2026-09-02: the
        platform verifies what it asserts and is honest about what it has not
        checked. An absent badge reads as an oversight; "we have not verified
        this company yet" is information a provider can act on.

        ⚠⚠ AND THERE IS EXACTLY ONE LAYOUT. When `E282` lands and
        `entityVerificationState()` starts returning "verified", the icon, the
        colour and the copy all change because the DATA changed — this component
        is not edited and there is no second branch to keep in step. That is the
        brief's requirement that the line become affirmative WITHOUT a redesign.
      */}
      <ul className="mt-3 grid gap-2 border-t border-line pt-3">
        {verification.map((v) => {
          const ok = v.state === "verified";
          const Icon = ok ? BadgeCheck : CircleDashed;
          return (
            <li key={v.key} className="flex gap-2">
              <Icon
                className={`mt-[1px] h-4 w-4 shrink-0 ${ok ? "text-emerald-700" : "text-ink-2/70"}`}
                aria-hidden
              />
              <span className="min-w-0 text-[12.5px] leading-relaxed">
                <b className={ok ? "text-emerald-800" : "text-ink"}>{v.label}</b>
                <span className="text-ink-2"> — {v.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
