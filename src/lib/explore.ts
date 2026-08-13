import { prisma } from "@/lib/prisma";
import { marketplaceVisibleWhere } from "@/lib/access";
import { capitalizeName } from "@/lib/display";
import { formatRate } from "@/lib/types";

/**
 * THE PUBLIC TEASER SEARCH (E032/E033) — what an anonymous visitor is allowed
 * to see of the marketplace before they have an account.
 *
 * MASKING IS ENFORCED BY THE TYPE, NOT BY THE TEMPLATE. `TeaserProvider` has a
 * `firstName` and no last name, no email, no phone, no company, and no profile
 * id that resolves to contact details. The Prisma select below never READS
 * `last_name`, so a future edit to the page cannot leak it by adding one line
 * of JSX — the field is not in the object. That is the same reasoning as
 * owner-scoping a write: make the wrong thing unavailable rather than
 * remembering not to do it.
 *
 * WHY MASK AT ALL. The identity-masking decision: a buyer who has not
 * transacted gets the expertise, not the person. First name, city, headline,
 * skills and rate are enough to judge whether an expert is worth talking to;
 * the surname and how to reach them are what the account, and eventually the
 * engagement, unlock.
 *
 * ✅ MASKING IS NOW ENFORCED EITHER SIDE. This used to read "as strong as the
 * pages around it": `/providers/[id]` was a public route rendering the full
 * profile, so the teaser cards could not deep-link to it and the masking was a
 * convention rather than a boundary. `brief_fix_pages_four_navs` gated that
 * route (verified: 307 -> /login logged out), so a teaser card CAN now point a
 * name at a profile — the gate is the system's, not this file's. Public callers
 * still route through /login with a callback so the click is not lost.
 *
 * VISIBILITY IS `marketplaceVisibleWhere()`, the same predicate the authed
 * directory and the public profile use. One definition of "discoverable", so a
 * provider cannot be teased here and hidden there.
 */

export type TeaserProvider = {
  /** Opaque to the client — used only to build a post-login callback URL. */
  id: string;
  /** MASKED: first name only, capitalized (E006). */
  firstName: string;
  /**
   * The card's one-line title: the provider's OWN headline, soft-capped.
   *
   * Scott, 2026-08-13: this is the title captured in an early onboarding step
   * and all 23 providers have one, so it is the field with an answer for
   * everybody — unlike the primary-specialty proxy this briefly used, which
   * 6 of 23 could not produce.
   */
  title: string;
  /** The uncapped headline. The card hangs it on `title=` so hover shows it whole. */
  headline: string;
  /** Headline school, cleaned. Null when no education row names one. */
  university: string | null;
  /** Real counts. Both zero => the card shows "New to Panameer" instead. */
  employerCount: number;
  projectCount: number;
  /** "Chicago, United States", or null when the seeded address has no city. */
  location: string | null;
  skills: string[];
  /** "$95/hr" or "$80–$120/hr". Never null — visibility requires a rate. */
  rate: string | null;
  validated: boolean;
  photoUrl: string | null;
};

export type TeaserWork = {
  id: string;
  title: string;
  /** The buyer's company, not the buyer — the same masking rule, other side. */
  company: string | null;
  location: string | null;
  skills: string[];
  budget: string | null;
};

/** How many teaser cards a visitor sees before the gate. */
export const TEASER_LIMIT = 4;

/**
 * Free-text over the fields a person would actually search: what the provider
 * says they do, the skills they claim, and the catalog branch they sit in.
 *
 * `contains`/`insensitive` rather than full-text. It is honest about what it is
 * — a teaser over 26 seeded profiles — and Postgres full-text would need a
 * tsvector column and a migration to beat it at this size. When the real search
 * lands it replaces this function, not its callers.
 */
function providerTextFilter(q: string) {
  const like = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { headline: like },
      { overview: like },
      { skills: { some: { skill: { name: like } } } },
      { roleType: { name: like } },
      { roleType: { display: like } },
      { pillar: { name: like } },
    ],
  };
}

export async function searchProvidersTeaser(
  q: string,
  take = TEASER_LIMIT
): Promise<{ cards: TeaserProvider[]; total: number }> {
  const term = q.trim();
  const where = {
    ...marketplaceVisibleWhere(),
    ...(term ? providerTextFilter(term) : {}),
  };

  /*
    `total` is the count of MATCHES, not of all providers — the gate says "see
    all N experts" and N has to be the number behind this search or it is a
    fabricated figure (E221). Counted in the same query shape as the page so the
    two can never disagree.
  */
  const [rows, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      take,
      orderBy: [{ validation_status: "asc" }, { updated_at: "desc" }],
      select: {
        id: true,
        headline: true,
        hourly_rate_cents: true,
        rate_min_cents: true,
        rate_max_cents: true,
        currency: true,
        validation_status: true,
        /*
          WS-2 pedigree. `_count` rather than fetching the rows: the card shows
          "8 Employers", so the number IS the payload — pulling eight employer
          records to call `.length` on them would ship the provider's work
          history to an anonymous visitor to render one digit.
        */
        _count: { select: { employers: true, projects: true } },
        education: { select: { institution: true } },
        // NOTE the absence of `last_name`. See the header comment.
        person: {
          select: {
            first_name: true,
            photo_url: true,
            site: {
              select: {
                addresses: {
                  select: { city: true, country: true },
                  take: 1,
                },
              },
            },
          },
        },
        skills: {
          select: { skill: { select: { name: true } } },
          take: 4,
        },
      },
    }),
    prisma.providerProfile.count({ where }),
  ]);

  return {
    total,
    cards: rows.map((p) => {
      const addr = p.person.site?.addresses[0];
      return {
        id: p.id,
        firstName: capitalizeName(p.person.first_name),
        title: cardTitle(p.headline),
        headline: p.headline,
        university: headlineSchool(p.education.map((e) => e.institution)),
        employerCount: p._count.employers,
        projectCount: p._count.projects,
        location: formatLocation(addr?.city, addr?.country),
        skills: p.skills.map((s) => s.skill.name),
        rate: rateLabel(
          p.rate_min_cents,
          p.rate_max_cents,
          p.hourly_rate_cents,
          p.currency
        ),
        validated: p.validation_status === "VALIDATED",
        photoUrl: p.person.photo_url,
      };
    }),
  };
}

/**
 * The other side of the toggle.
 *
 * ⚠ THIS RETURNS NOTHING TODAY, and that is the truth rather than a bug: there
 * are zero Work Requests in any status, so there is nothing posted for a
 * provider to find. Written properly anyway — the moment the first request is
 * posted this starts returning it, with no page change.
 *
 * POSTED only. A DRAFT is somebody's half-finished form and is not for public
 * consumption at any stage.
 */
export async function searchWorkTeaser(
  q: string,
  take = TEASER_LIMIT
): Promise<{ cards: TeaserWork[]; total: number }> {
  const term = q.trim();
  const like = { contains: term, mode: "insensitive" as const };
  const where = {
    status: "POSTED" as const,
    ...(term
      ? {
          OR: [
            { title: like },
            { description: like },
            { skills: { some: { skill: { name: like } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.workRequest.findMany({
      where,
      take,
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        title: true,
        location_country: true,
        budget_min_cents: true,
        budget_max_cents: true,
        budget_amount_cents: true,
        currency: true,
        buyer: { select: { company: { select: { name: true } } } },
        skills: { select: { skill: { select: { name: true } } }, take: 4 },
      },
    }),
    prisma.workRequest.count({ where }),
  ]);

  return {
    total,
    cards: rows.map((w) => ({
      id: w.id,
      title: w.title,
      company: w.buyer?.company?.name ?? null,
      location: w.location_country ?? null,
      skills: w.skills.map((s) => s.skill.name),
      budget: rateLabel(
        w.budget_min_cents,
        w.budget_max_cents,
        w.budget_amount_cents,
        w.currency
      ),
    })),
  };
}

/**
 * "Chicago, United States" — and null rather than ", United States" when the
 * city is missing, which several seeded addresses are. A dangling comma is how
 * a page announces it is rendering a hole.
 */
function formatLocation(
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  const parts = [city?.trim(), country?.trim()].filter(
    (s): s is string => Boolean(s) && s !== "null"
  );
  return parts.length ? parts.map(capitalizeName).join(", ") : null;
}

/** A range where one exists, a single figure otherwise, null if neither. */
function rateLabel(
  min: number | null,
  max: number | null,
  single: number | null,
  currency: string
): string | null {
  if (min !== null && max !== null && max !== min) {
    const lo = formatRate(min, currency)?.replace("/hr", "");
    const hi = formatRate(max, currency);
    return lo && hi ? `${lo}–${hi}` : null;
  }
  return formatRate(min ?? max ?? single, currency);
}


/**
 * The card title — the provider's headline, softly capped.
 *
 * WHY A SOFT CAP AND NOT JUST `truncate`. CSS truncation already guarantees one
 * line, so the cap is not about overflow; it is about what a card promises. A
 * 72-character headline clipped by the browser reads as a system that ran out
 * of room, while the same headline cut at a word with an ellipsis reads as a
 * summary that continues on the profile. The full text is on the element's
 * `title` attribute either way.
 *
 * 42, MEASURED, NOT PICKED. Across the 23 marketplace-visible providers the
 * headline runs 19–72 characters (median 34, p90 47). 42 is the smallest cap
 * that keeps every headline that is actually a title — including the longest
 * real one, "AI Enabled Oracle Cloud Procurement Expert" at exactly 42 — while
 * still cutting the three that are not: a 49-character stacked job title, a
 * 47-character joke ("Great Guitar Player, Part Time Oracle Cloud Guy") and a
 * 72-character list of services. 20 of 23 render whole. It also clears the
 * mock's reference line, "Oracle Cloud & AI Transformation Expert" (39).
 *
 * Cutting at 40 would have cost that 42-character headline its last word —
 * "…Procurement" instead of "…Procurement Expert" — for two characters.
 *
 * NEVER FABRICATES. A short or empty headline is returned as-is; there is no
 * padding, no appended "Expert", no fallback text.
 */
export const TITLE_SOFT_CAP = 42;

function cardTitle(headline: string): string {
  const t = headline.trim().replace(/\s+/g, " ");
  if (t.length <= TITLE_SOFT_CAP) return t;
  /*
    Cut at the last word boundary inside the cap, so no word is bisected. A
    single word longer than the cap (no space to fall back to) is hard-cut —
    otherwise the whole title would vanish.
  */
  const head = t.slice(0, TITLE_SOFT_CAP);
  const lastSpace = head.lastIndexOf(" ");
  const body = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return body.replace(/[\s,;:/&|-]+$/, "") + "\u2026";
}

/**
 * The headline school.
 *
 * ── THIS USED TO BE A BAND-AID. IT IS NOW A SAFETY NET ───────────────────────
 *
 * `Education.institution` was full of things that are not schools — the résumé
 * parser wrote degrees, fields, GPA fragments and plain accomplishment bullets
 * into it, so this function did string surgery ("Attended ", "  •  3.72 GPA")
 * to dig a school back out on every page render. WS-3 (2026-08-13) fixed that
 * where it belongs: `scrubInstitution` in the parser so new imports land clean,
 * and `prisma/clean-education-institutions.ts` over the 55 stored rows (12
 * cleaned, 22 blanked, 21 already clean). All the surgery is gone from here.
 *
 * The school TEST stays, because the parser is not the only writer — a provider
 * can type anything into the institution field on the review page, and that
 * path never touches `fixEducationRow`. One regex is cheap insurance against a
 * public card captioning a degree with a graduation-cap icon.
 *
 * Blank when nothing qualifies. The card then shows two pedigree items, which
 * is a missing fact rather than a false one.
 */
const SCHOOL_NAME =
  /\b(universi\w*|college|institute|instituto|school|academy|polytechnic|seminary|hochschule|iit|iim|nit)\b/i;

function headlineSchool(institutions: string[]): string | null {
  return institutions.find((i) => i?.trim() && SCHOOL_NAME.test(i))?.trim() ?? null;
}
