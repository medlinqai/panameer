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
