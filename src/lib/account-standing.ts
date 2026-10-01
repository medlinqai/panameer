/**
 * ── ⚠⚠ ACCOUNT STANDING — ONE COMPUTATION, TWO READERS (`P2-A2-E598` WS-A) ─
 *
 * ⚠ The avatar menu's `Account Health` row shows *"All good"* or the problem,
 * and `/account-health` renders the same three facts as tiles.
 * ⚠⚠⚠ THAT IS EXACTLY `E585` — two computations of one concept, kept in step by
 * hand — so the predicate lives here and BOTH surfaces call it. A menu that
 * says *"All good"* over a page listing a problem is worse than no menu row.
 *
 * ⚠ IT IS DELIBERATELY NOT A SCORE. `/account-health` records why: *"a numeric
 * 'health score' would be a made-up aggregate of things that mean different
 * things."* This returns the LINES and whether they all pass — never a number.
 */

export type StandingLine = {
  label: string;
  value: string;
  ok: boolean;
};

export type StandingInput = {
  status: string;
  emailVerified: boolean;
};

/**
 * The account-standing lines, in the order `/account-health` renders them.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — this was inline in
 * `src/app/(app)/account-health/page.tsx` as `const standing = [...]`:
 * //   {
 * //     label: "Account status",
 * //     value: profile.status === "ACTIVE" ? "Active" : "Pending email verification",
 * //     ok: profile.status === "ACTIVE",
 * //   },
 * //   {
 * //     label: "Email verified",
 * //     value: profile.person.user?.email_verified ? "Yes" : "Not yet",
 * //     ok: !!profile.person.user?.email_verified,
 * //   },
 * ⚠⚠ THE THIRD LINE IS STILL FOLDED OUT — `Panameer validation` left in
 * `P2-J2-E563` WS-A as the third copy of a `/stats` criterion. Moving this
 * function did not bring it back.
 */
export function accountStandingLines(p: StandingInput): StandingLine[] {
  return [
    {
      label: "Account status",
      value: p.status === "ACTIVE" ? "Active" : "Pending email verification",
      ok: p.status === "ACTIVE",
    },
    {
      label: "Email verified",
      value: p.emailVerified ? "Yes" : "Not yet",
      ok: p.emailVerified,
    },
  ];
}

/**
 * ⚠⚠ THE MENU'S ONE-WORD ANSWER. `null` means "no provider profile", which is
 * NOT the same as "something is wrong" — a member with no seller profile has
 * no standing to report, and rendering *"All good"* at them would be a claim
 * about an account that does not exist.
 */
export function accountStandingSummary(lines: StandingLine[]): {
  ok: boolean;
  label: string;
} {
  const bad = lines.find((l) => !l.ok);
  /* ⚠ THE PROBLEM, NOT A COUNT. Scott's brief: *"shows 'All good' or the
     problem"* — so a failing line reports ITS OWN value, which is already
     written as a human sentence fragment ("Not yet", "Pending email
     verification"). A row reading "1 issue" would make you open the page to
     find out which, and that is the question the row exists to answer. */
  return bad ? { ok: false, label: bad.value } : { ok: true, label: "All good" };
}

/**
 * ── ⚠⚠⚠ THE ACCESS LINES, AND WHY THEY MOVED HERE (`P2-A1.1-E730` WS-B) ──────────
 *
 * ⚠ They were a LOCAL LITERAL in `account-health/page.tsx`, which was fine while
 * exactly one page counted them. ⚠⚠ The Usage page's Account Health gauge counts the
 * same checks, and **a second copy of this array would have been `E585` on a figure
 * two pages print side by side** — the health page saying "2 passing" while the gauge
 * said something else the first time either list changed.
 * ⚠⚠⚠ **MOVED, NOT COPIED.** `account-health/page.tsx` imports this now; its inline
 * array is gone. The LINES, their ORDER and their NOTES are unchanged — this is a
 * relocation, not a rewrite, so the health page renders exactly what it rendered.
 */
export type AccessInput = { availableForMessages: boolean };

/**
 * ⚠⚠ ITS OWN TYPE, NOT `StandingLine`. ⚠⚠⚠ THEY LOOK ALIKE AND ARE NOT: a standing line
 * carries a `value` (*"Not yet"*, *"Pending email verification"*) that the avatar menu
 * prints as the problem; an access line carries a `note` that EXPLAINS a true/false.
 * ⚠ Forcing one type over both would mean inventing a `value` for rows that have none,
 * and `accountStandingSummary` reads `value` to decide what the menu row says — so a
 * fabricated one would surface as the member's account problem.
 */
export type AccessLine = { label: string; ok: boolean; note: string };

export function accountAccessLines(p: AccessInput): AccessLine[] {
  return [
    {
      label: "Sign in and manage your profile",
      ok: true,
      note: "Available on every account.",
    },
    {
      label: "Receive messages from buyers",
      ok: p.availableForMessages,
      note: p.availableForMessages
        ? "You're marked online for messages."
        : "You've switched off 'Online for messages' in the account menu.",
    },
  ];
}

/**
 * ── ⚠⚠ THE TWO FIGURES, COUNTED FROM THE ROWS THEMSELVES ─────────────────────────
 *
 * ⚠ **THE COUNT IS DERIVED FROM THE SAME ARRAYS THE PAGE RENDERS**, so a figure can
 * never name a check the list is not showing. That was already the health page's own
 * rule; this keeps it while giving the gauge the same answer.
 * ⚠⚠ `passing + failing` IS THE TOTAL AND IS A REAL DENOMINATOR — every check that
 * exists, not an aspiration. That is why the Account Health gauge is the one gauge
 * whose scale is measured rather than configured.
 */
export function accountCheckCounts(
  lines: ReadonlyArray<ReadonlyArray<{ ok: boolean }>>
): { passing: number; failing: number } {
  /* ⚠ It reads `ok` and nothing else, so it takes BOTH shapes without either type
     having to pretend to be the other. */
  const all = lines.flat().map((l) => l.ok);
  const passing = all.filter(Boolean).length;
  return { passing, failing: all.length - passing };
}
