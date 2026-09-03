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

/** ⚠ Two spans overlap when each starts before the other ends. A null end is
    "still there", so it extends to now. */
function overlaps(
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null
): boolean {
  /* ⚠ NO DATES MEANS NO CLAIM. The rule is "at the same time" and a row with no
     start cannot support it — the résumé importer leaves plenty of those. */
  if (!aStart || !bStart) return false;
  const now = new Date();
  const ae = aEnd ?? now;
  const be = bEnd ?? now;
  return aStart <= be && bStart <= ae;
}

const yr = (d: Date | null) => (d ? String(d.getUTCFullYear()) : null);

/** `2021–2023`, or `2021–present`. */
function span(start: Date | null, end: Date | null): string {
  const s = yr(start);
  if (!s) return "";
  return `${s}–${yr(end) ?? "present"}`;
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
          employers: { select: { name: true, start_date: true, end_date: true } },
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
        providerProfile: { select: { person: { select: personSel } } },
      },
      take: 40,
    });
    for (const t of theirs) {
      if (!overlaps(mine.start_date, mine.end_date, t.start_date, t.end_date)) continue;
      /* ⚠ THE REASON NAMES THE EMPLOYER AND THE YEARS — the fact, not a score. */
      const both = span(
        new Date(Math.max(+mine.start_date, +(t.start_date ?? mine.start_date))),
        mine.end_date && t.end_date
          ? new Date(Math.min(+mine.end_date, +t.end_date))
          : null
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
