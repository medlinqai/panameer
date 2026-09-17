import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import type { PersonCard } from "@/lib/connections";

/**
 * COLLEAGUE SUGGESTIONS, FROM DATA PANAMEER ALREADY HAS (`P1-ALL-E372` WS-3).
 *
 * Scott's journey: *"Panameer Shows/Sends Colleague Suggestions."*
 *
 * ── ⚠⚠ NOT A GENERIC "PEOPLE YOU MAY KNOW" ───────────────────────────────────
 *
 * Panameer knows something LinkedIn has to guess at: **who worked where, on what,
 * when.** `Employer`, `Project` and `ProviderProfileSpecialization` are already
 * populated by the résumé importer, so every suggestion here rests on a fact.
 *
 * ⚠⚠ AND EVERY SUGGESTION CARRIES ITS REASON. *"You were both at Dell in
 * 2021–2023"* is evidence; an unexplained row is a guess. Same rule the LEARN
 * suggested path follows — *"Because Payables and Accounting Center are on your
 * profile."* ⚠ `reason` IS NOT OPTIONAL ON THE TYPE, so a suggestion cannot be
 * constructed without one and `check:community` asserts it.
 *
 * ── THE THREE RULES, STRONGEST FIRST ─────────────────────────────────────────
 *
 *   1  same `Employer`, OVERLAPPING DATES — the strongest, because you were
 *      there at the same time
 *   2  same `Project` client — you worked the same engagement
 *   3  same specialization AND same region — weakest, and last
 *
 * ⚠ ONE SUGGESTION PER PERSON, KEPT AT ITS STRONGEST REASON. Somebody who
 * matches on all three appears once, explained by the employer overlap.
 */

export type SuggestionRule = "employer" | "project" | "specialization";

export type ColleagueSuggestion = {
  person: PersonCard;
  rule: SuggestionRule;
  /** ⚠ REQUIRED. Rendered verbatim under the name. */
  reason: string;
};

type JobSpan = { start: Date | null; end: Date | null; isCurrent: boolean };

/**
 * ── ⚠⚠ WHERE A JOB ENDS, FOR THE PURPOSE OF A CLAIM (`P2-J1.4-E549`) ────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`): *"A null end is 'still there', so it
 * extends to now."* — `const ae = aEnd ?? now;`
 * ⚠⚠ ONLY A CURRENT JOB EXTENDS TO NOW. A null end that is not current is an
 * end nobody could read, and Scott ruled it is evidence the job ENDED. Scott:
 * *"a sentence that says 'present' about a job that isn't is the same lie in
 * smaller type."* ⚠ `null` here means "unknown" — and an unknown end supports
 * no "at the same time" claim.
 */
function effectiveEnd(j: JobSpan, now: Date): Date | null {
  if (j.end) return j.end;
  return j.isCurrent ? now : null;
}

/** ⚠ Two spans overlap when each starts before the other ends. */
function overlaps(a: JobSpan, b: JobSpan, now: Date): boolean {
  /* ⚠ NO DATES MEANS NO CLAIM. The rule is "at the same time" and a row with no
     start cannot support it — the résumé importer leaves plenty of those. */
  if (!a.start || !b.start) return false;
  const ae = effectiveEnd(a, now);
  const be = effectiveEnd(b, now);
  if (!ae || !be) return false;
  return a.start <= be && b.start <= ae;
}

const yr = (d: Date | null) => (d ? String(d.getUTCFullYear()) : null);

/**
 * `2021–2023`, or `2021–present` ONLY when BOTH jobs are still running.
 * ⚠ `E549` — SUPERSEDED, quoted (`E164`): `${s}–${yr(end) ?? "present"}`, which
 * printed "present" whenever EITHER end was missing, so "you were both at X in
 * 2018–present" could describe two people one of whom left in 2020.
 */
function span(start: Date | null, end: Date | null, ongoing: boolean): string {
  const s = yr(start);
  if (!s) return "";
  if (ongoing) return `${s}–present`;
  const e = yr(end);
  return e ? `${s}–${e}` : "";
}

export async function getColleagueSuggestions(
  viewer: Viewer,
  take = 8
): Promise<ColleagueSuggestion[]> {
  const me = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      providerProfile: {
        select: {
          id: true,
          employers: { select: { name: true, start_date: true, end_date: true, is_current: true } },
          projects: { select: { client_name: true } },
          specializations: { select: { specialization_id: true } },
        },
      },
      site: { select: { addresses: { select: { state: true, country: true }, take: 1 } } },
    },
  });
  if (!me?.providerProfile) return [];

  /*
    ⚠ EXCLUDE ANYONE ALREADY CONNECTED IN ANY STATE — including DECLINED.
    Re-suggesting somebody who said no is exactly what makes a decline
    meaningless, and it is the same reasoning that keeps the row.
  */
  const known = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      OR: [{ from_user_id: viewer.userId }, { to_user_id: viewer.userId }],
    },
    select: { from_user_id: true, to_user_id: true },
  });
  const excludeUsers = new Set<string>([viewer.userId]);
  for (const k of known) {
    excludeUsers.add(k.from_user_id);
    excludeUsers.add(k.to_user_id);
  }

  const out = new Map<string, ColleagueSuggestion>();

  const personSel = {
    id: true,
    first_name: true,
    last_name: true,
    title: true,
    photo_url: true,
    company: { select: { name: true } },
    user: { select: { id: true } },
  } as const;
  type Row = {
    id: string; first_name: string; last_name: string; title: string | null;
    photo_url: string | null; company: { name: string } | null; user: { id: string } | null;
  };
  const card = (p: Row): PersonCard => ({
    userId: p.user?.id ?? "",
    personId: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    title: p.title,
    photoUrl: p.photo_url,
    company: p.company?.name ?? null,
  });
  const add = (p: Row, rule: SuggestionRule, reason: string) => {
    const uid = p.user?.id;
    /* ⚠ NO LOGIN, NO SUGGESTION — a request to a person with no account goes
       nowhere, and inviting a non-member needs the mail pipe this brief excludes. */
    if (!uid || excludeUsers.has(uid) || out.has(uid)) return;
    out.set(uid, { person: card(p), rule, reason });
  };

  /* ── RULE 1 · same employer, overlapping dates ───────────────────────────── */
  for (const mine of me.providerProfile.employers) {
    if (!mine.name?.trim() || !mine.start_date) continue;
    const theirs = await prisma.employer.findMany({
      where: {
        name: { equals: mine.name, mode: "insensitive" },
        providerProfile: { person: { user: { isNot: null } } },
        NOT: { provider_profile_id: me.providerProfile.id },
      },
      select: {
        start_date: true,
        end_date: true,
        is_current: true,
        providerProfile: { select: { person: { select: personSel } } },
      },
      take: 40,
    });
    const now = new Date();
    const a: JobSpan = { start: mine.start_date, end: mine.end_date, isCurrent: mine.is_current };
    for (const t of theirs) {
      const b: JobSpan = { start: t.start_date, end: t.end_date, isCurrent: t.is_current };
      if (!overlaps(a, b, now)) continue;
      /* ⚠ THE REASON NAMES THE EMPLOYER AND THE YEARS — the fact, not a score.
         ⚠ `E549` — the shared span ends at the EARLIER effective end, and reads
         "present" only when both are still there. Both ends are known here:
         `overlaps` refused any unknown end. */
      const ae = effectiveEnd(a, now)!;
      const be = effectiveEnd(b, now)!;
      const both = span(
        new Date(Math.max(+mine.start_date, +(t.start_date ?? mine.start_date))),
        new Date(Math.min(+ae, +be)),
        !mine.end_date && !t.end_date && mine.is_current && t.is_current
      );
      add(
        t.providerProfile.person,
        "employer",
        `You were both at ${mine.name}${both ? ` in ${both}` : ""}`
      );
    }
  }

  /* ── RULE 2 · same project client ────────────────────────────────────────── */
  for (const mine of me.providerProfile.projects) {
    if (!mine.client_name?.trim()) continue;
    const theirs = await prisma.project.findMany({
      where: {
        client_name: { equals: mine.client_name, mode: "insensitive" },
        providerProfile: { person: { user: { isNot: null } } },
        NOT: { provider_profile_id: me.providerProfile.id },
      },
      select: { providerProfile: { select: { person: { select: personSel } } } },
      take: 40,
    });
    for (const t of theirs) {
      add(t.providerProfile.person, "project", `You both worked with ${mine.client_name}`);
    }
  }

  /* ── RULE 3 · same specialization AND same region ────────────────────────── */
  const myState = me.site?.addresses?.[0]?.state?.trim() ?? null;
  const mySpecIds = me.providerProfile.specializations.map((s) => s.specialization_id);
  if (myState && mySpecIds.length > 0) {
    const theirs = await prisma.providerProfile.findMany({
      where: {
        id: { not: me.providerProfile.id },
        specializations: { some: { specialization_id: { in: mySpecIds } } },
        person: {
          user: { isNot: null },
          site: { addresses: { some: { state: { equals: myState, mode: "insensitive" } } } },
        },
      },
      select: {
        person: { select: personSel },
        specializations: {
          where: { specialization_id: { in: mySpecIds } },
          select: { specialization: { select: { name: true } } },
          take: 1,
        },
      },
      take: 40,
    });
    for (const t of theirs) {
      const spec = t.specializations[0]?.specialization?.name;
      /* ⚠ NO NAME, NO SUGGESTION. "Same specialization" with nothing to name is
         the unexplained row this rule exists to avoid. */
      if (!spec) continue;
      add(t.person, "specialization", `Both in ${spec}, both in ${myState}`);
    }
  }

  return [...out.values()].slice(0, take);
}
