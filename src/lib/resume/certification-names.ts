/**
 * ── ⚠⚠ FIVE CERTIFICATIONS THAT ARRIVED AS ONE ROW (`P1-A1.4-E412` WS-3a) ───
 *
 * ⚠ WHAT THE PASS ACTUALLY RETURNS, MEASURED BEFORE ANYTHING WAS CHANGED —
 * five runs of `certificationsPass` over the SAME document
 * (`__fixtures__/scott-new-full.docx`, `gpt-5-nano`):
 *
 *     run 1 — 0 entries
 *     run 2 — 1 entry:  "ORACLE CLOUD CERTIFICATIONS: Procurement, Contract
 *                        Management, Payables, Oracle Business Network (OBN),
 *                        and Inventory Management"
 *     run 3 — 5 entries: "Procurement" / "Contract Management" / "Payables" /
 *                        "Oracle Business Network (OBN)" / "Inventory Management"
 *     run 4 — 1 entry:  "Procurement, Contract Management, Payables, Oracle
 *                        Business Network (OBN), and Inventory Management."
 *     run 5 — 5 entries: as run 3
 *
 * ⚠⚠ SO IT IS BOTH, ON ONE DOCUMENT, RUN TO RUN — and that is the finding.
 * `E412` asks whether this is an extraction fix or a rendering fix on the
 * grounds that *"they are different files"*. It is **neither on its own**: the
 * pass is right 2 times in 5 and comma-joined 2 times in 5, so no prompt change
 * makes it deterministic and no renderer can un-write a row that is already in
 * the database. ⚠ THE SPLIT THEREFORE LIVES ON THE WRITE PATH — one row per
 * credential in `certifications`, which is also the only place that makes the
 * rows separately EDITABLE, deletable and countable.
 *
 * ⚠ THE SOURCE LINE, for the record. The CV carries the whole section as one
 * line under its own heading — there is nothing on it to segment on but
 * punctuation:
 *
 *     24  ORACLE CLOUD CERTIFICATIONS
 *     25
 *     26  Procurement, Contract Management, Payables, Oracle Business Network
 *         (OBN), and Inventory Management.
 *
 * ── ⚠⚠ THE RULE, AND WHY IT IS THIS NARROW ──────────────────────────────────
 *
 * `E412`: *"A real credential name can contain a comma — 'Oracle Cloud
 * Procurement, 2024 Implementation Professional' is one certification, not
 * two… five wrong rows is worse than one right one."*
 *
 * ⚠ SO COMMAS ALONE NEVER SPLIT ANYTHING. A split requires the **serial
 * conjunction**: the last comma-separated segment must BEGIN with `and`, `or`
 * or `&`. That is a property of a written list and essentially never a property
 * of one product name.
 *
 * ⚠⚠ THE NON-OXFORD FORM IS DELIBERATELY NOT HANDLED, and it is the one
 * judgement call in here. `A, B and C` is a list too — but so is
 * *"Oracle Cloud Procurement, Contract and Sourcing Implementation
 * Professional"*, which is ONE credential, and nothing in the string tells them
 * apart. ⚠ THE COST OF DECLINING IS ONE ROW SCOTT CAN SPLIT BY HAND in the
 * editor `WS-1` just made reachable from the review; the cost of guessing is
 * three fabricated credentials with his name on them. The brief chose that
 * trade explicitly and so does this.
 *
 * ⚠ THREE PARTS MINIMUM. `"A, and B"` is not something people write, so a
 * two-part split is far more likely to be a mis-read than a list.
 */

/** Longest a segment may be and still read as a credential name, not prose. */
const MAX_PART = 80;

/**
 * ⚠ A HEADING THE MODEL SOMETIMES GLUES ON THE FRONT (run 2 above). Stripped
 * only when the text before the colon is ALL CAPS **and** says what it is —
 * `ORACLE CLOUD CERTIFICATIONS:`. ⚠ A real credential name is not written in
 * block capitals and then colon-terminated, so this cannot bite a genuine one.
 */
const HEADING_PREFIX =
  /^[A-Z][A-Z\s&()/-]*\b(?:CERTIFICATIONS?|CREDENTIALS?|LICEN[CS]ES?|ACCREDITATIONS?)\b[A-Z\s&()/-]*:\s*/;

/** The serial conjunction that marks the last item of a written list. */
const TRAILING_CONJUNCTION = /^(?:and|or|&)\s+(.+)$/i;

const clean = (v: string) => v.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");

/**
 * One certification name in, one or more out.
 *
 * ⚠ ALWAYS RETURNS AT LEAST THE INPUT (cleaned). A name it declines to split is
 * returned whole — the function can never lose a credential, only decline to
 * divide one.
 */
export function splitCertificationName(raw: string): string[] {
  const stripped = clean(raw.replace(HEADING_PREFIX, ""));
  if (!stripped) return [];

  const segments = stripped.split(",").map((s) => s.trim()).filter(Boolean);

  /* Not a list: no commas, or only one item after the split. */
  if (segments.length < 3) return [stripped];

  /* ⚠ THE GATE ON THE WHOLE RULE — the last segment must open with `and`/`or`/`&`. */
  const tail = TRAILING_CONJUNCTION.exec(segments[segments.length - 1]);
  if (!tail) return [stripped];

  const parts = [...segments.slice(0, -1), tail[1]].map(clean).filter(Boolean);

  /* A part that is empty or paragraph-length means this was not a list of
     names after all — return the original rather than a set of fragments. */
  if (parts.length < 3 || parts.some((p) => p.length > MAX_PART)) {
    return [stripped];
  }
  return parts;
}
