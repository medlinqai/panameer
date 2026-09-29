import Link from "next/link";

/**
 * ── ⚠⚠⚠ EARNED IS NOT DECLARED, AND A BUYER MUST SEE WHICH (`P2-A4-E710`) ───
 *
 * ⚠⚠ **ONE COMPONENT OWNS THIS TREATMENT AND EVERY RENDERER CALLS IT.** Three
 * surfaces showed credentials and none of them showed provenance; three surfaces each
 * inventing a treatment is how they drift apart (`E585`), and this is the axis where
 * drift is a **trust** defect rather than a cosmetic one.
 *
 * ── ⚠⚠⚠ WHY IT IS A LINK AND NOT A BADGE ───────────────────────────────────
 *
 * ⚠⚠ **THE DISTINCTION THAT MATTERS IS *CHECKABLE BY A STRANGER*, NOT *DECORATED
 * DIFFERENTLY*.** A `LEARN` credential has a real public page — `/verify/{credentialId}`,
 * whose own lookup requires `issued_from: "LEARN"` — and `public-routes.ts` records why
 * it is public: *"A certificate's public verify URL is THE ENTIRE POINT OF CERTIFYING…
 * Gate `/verify/[credentialId]` and the certificate means nothing."*
 * ⚠⚠⚠ **SO THE EARNED ONE OFFERS PROOF AND THE SELF-REPORTED ONE OFFERS A CLAIM. That
 * is the difference, and a link expresses it exactly.**
 *
 * ── ⚠⚠ READABLE WITH COLOUR REMOVED (`E433` — meaning, not decoration) ──────
 *
 * ⚠⚠⚠ **THE WORDS CARRY IT. NOTHING HERE DEPENDS ON HUE**: one row reads *"Verified by
 * Panameer"* and the other *"Self-reported"*. ⚠ A buyer on a phone in sunlight, or
 * looking at a greyscale screenshot in an email, still sees which is which — the test
 * `check:credential-provenance` applies by asserting the two labels differ as TEXT.
 * ⚠ The underline on the verified row is a second, non-colour signal; the muted tone is
 * a third and is the only one that is allowed to be decorative.
 *
 * ── ⚠⚠⚠ THE SELF-REPORTED ONE IS NOT SHAMED AND NOT HIDDEN ─────────────────
 *
 * ⚠⚠ **A PROVIDER'S REAL ORACLE CERTIFICATE IS VALUABLE AND TRUE. IT IS SIMPLY NOT
 * SOMETHING PANAMEER WITNESSED.** ⚠ *"Self-reported"* states the source and judges
 * nothing — it is the word the schema itself uses, and `import.ts:1013` already frames
 * it the same neutral way: *"it came off the provider's own CV."*
 * ⚠⚠⚠ **WHAT THIS LABEL MUST NEVER SAY, AND THIS BINDS ANY FUTURE EDIT: unverified,
 * unconfirmed, claimed, alleged, or anything with a warning glyph.** Those imply doubt
 * about a document Panameer has no opinion on, and that is a different — and false —
 * statement from *"we did not witness this."* It is `E517`'s copy rule on a new axis.
 *
 * ⚠ **MEASURED 2026-09-29, SO NOBODY READS THIS AS LIVE YET:** all **12** certifications
 * are `SELF_REPORTED`, **0** are earned, and `CertificationAttempt` holds **0** rows —
 * but `learn-assessment.ts:979` already writes `issued_from: "LEARN"`, so **the writer
 * exists and the first pass makes this live.**
 */
export type CredentialProvenanceProps = {
  /** The discriminator that already existed — `CredentialSource`. */
  issuedFrom: string | null;
  /** Null on a self-reported row, and on an earned row that predates the id. */
  credentialId: string | null;
  className?: string;
};

/**
 * ⚠ The one place the enum value becomes a word.
 *
 * ── ⚠⚠⚠ IT IS "EARNED ON PANAMEER", NOT "VERIFIED BY PANAMEER", AND THE REASON
 * IS A COLLISION I FOUND ON THE ROW ITSELF ─────────────────────────────────────
 *
 * ⚠⚠ **`sections.tsx` ALREADY RENDERS A LINK LABELLED `Verify` FOR `c.url` — THE
 * PROVIDER'S OWN SUPPLIED URL — AND IT RENDERS IT ON SELF-REPORTED ROWS.** So a second
 * *"Verified…"* string beside it would put two different meanings of one word on one
 * credential, which is `E459`'s defect verbatim: *"neither was obvious."*
 * ⚠ **`Earned on Panameer` states the fact more precisely anyway** — the provider sat a
 * test here — and it cannot be confused with an issuer's own check.
 * ⚠⚠ The destination page keeps its own heading (*"✓ Verified Credential"*), which is
 * correct there: that page IS Panameer verifying. The label is about WHERE it came
 * from; the page is about WHAT Panameer says. Different sentences, deliberately.
 *
 * ⚠⚠⚠ **REPORTED, NOT FIXED — `Verify` ON A SELF-REPORTED CREDENTIAL IS ITSELF
 * MISLEADING.** It points at a URL the provider typed in, so the word invites a buyer to
 * believe something was checked. ⚠ **Renaming it is a copy decision and copy is
 * Scott's** (`E533`); candidates are *"Issuer's link"* or *"Provider's link"*. Named
 * here so it is not lost.
 */
export const PROVENANCE_EARNED = "Earned on Panameer";
export const PROVENANCE_SELF = "Self-reported";

export function CredentialProvenance({
  issuedFrom,
  credentialId,
  className = "",
}: CredentialProvenanceProps) {
  const earned = issuedFrom === "LEARN";

  /*
    ⚠⚠ AN EARNED CREDENTIAL WITH NO `credential_id` STILL SAYS IT IS EARNED — it just
    cannot offer the page. ⚠⚠⚠ **FALLING BACK TO "Self-reported" WOULD BE A FALSE
    STATEMENT ABOUT PROVENANCE** to avoid a dead link, which is the wrong trade: the
    fact is the provenance, the link is the convenience (`90b` — a false value in a true
    column is worse than an absent one).
  */
  if (earned && !credentialId) {
    return (
      <span className={"text-[12.5px] font-bold text-ink-2 " + className}>
        {PROVENANCE_EARNED}
      </span>
    );
  }

  if (earned) {
    return (
      <Link
        href={`/verify/${credentialId}`}
        className={"text-[12.5px] font-bold text-ink underline " + className}
      >
        {PROVENANCE_EARNED}
      </Link>
    );
  }

  return (
    <span className={"text-[12.5px] text-ink-2 " + className}>{PROVENANCE_SELF}</span>
  );
}
