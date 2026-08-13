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
   * The card's one-line title, DERIVED from the primary Specialty (WS-2) —
   * "Oracle Cloud Expert", not whatever the provider typed. `headline` is
   * free text and free text is unregulated; the specialty comes from the
   * catalog, so every card makes a claim of the same size.
   */
  title: string;
  /** Free text. Still carried for the fallback when there is no specialty. */
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
        specializations: {
          select: {
            specialization: {
              select: { name: true, kind: true, sort_order: true },
            },
          },
        },
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
        title: specialtyTitle(
          p.specializations.map((s) => s.specialization),
          p.headline
        ),
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
 * The card title, from the provider's primary Specialty (WS-2).
 *
 * "PRIMARY" IS THE LOWEST-SORTED PRODUCT, and that is a stand-in. Providers
 * multi-select specializations and nothing marks one as primary, so there is no
 * stored answer to read. PRODUCT-kind is the right family (the thing they work
 * ON — Oracle Cloud, PeopleSoft — rather than a methodology or a sector), and
 * `sort_order` is the catalog's own priority: the xlsx pins ERP above AI above
 * the rest, so the lowest number is the most load-bearing system they claim.
 * Deterministic, and it stops being a guess the moment a `primary` flag exists.
 *
 * Measured on the 23 marketplace-visible profiles: 17 have a PRODUCT
 * specialization, 6 do not. Those 6 fall back to the free-text headline rather
 * than rendering an empty title — a blank line is worse than unregulated text.
 *
 * "Expert" is not appended when the specialty already ends in a role noun.
 * "Oracle Cloud" -> "Oracle Cloud Expert"; a specialty someone named
 * "…Consultant" is not turned into "…Consultant Expert".
 */
const ROLE_NOUN = /\b(expert|consultant|specialist|architect|engineer|advisor|analyst|lead|manager|director)$/i;

function specialtyTitle(
  specs: { name: string; kind: string; sort_order: number }[],
  headline: string
): string {
  const primary = specs
    .filter((s) => s.kind === "PRODUCT")
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))[0];
  if (!primary) return headline;
  const name = primary.name.trim();
  return ROLE_NOUN.test(name) ? name : `${name} Expert`;
}

/**
 * The headline school — and mostly, a filter for what is NOT one.
 *
 * ⚠ `Education.institution` IS DIRTY, and this is the honest response to it
 * rather than a workaround worth hiding. The AI résumé parser has been writing
 * degrees into the institution column: across the 23 visible profiles the
 * column holds "Bachelor of Arts in Accounting", "Business Administration",
 * "Chartered Institute of Management Accountants", "Attended University of
 * South Florida - Tampa", and "San Diego State University  •  3.72 GPA".
 * Taking `education[0].institution` would have printed "Bachelor of Arts in
 * Accounting" on a public card under a graduation-cap icon.
 *
 * So: only rows that NAME a school qualify, the "Attended " prefix and any
 * trailing "• 3.72 GPA" fragment are stripped, and a profile with nothing
 * school-shaped simply omits the item. 16 of 23 match; the other 7 show two
 * pedigree items instead of three, which is the truth about their data.
 *
 * The real fix is upstream in the parser, not here. Flagged, not silently
 * papered over — this function is the paper.
 */
const SCHOOL_NAME = /universit|college|\bschool\b|academy|polytechnic|institute of technology/i;

function headlineSchool(institutions: string[]): string | null {
  const hit = institutions.find((i) => i && SCHOOL_NAME.test(i));
  if (!hit) return null;
  return (
    hit
      .replace(/^\s*attended\s+/i, "")
      // "San Diego State University  •  3.72 GPA" -> the school
      .split(/\s*[•|]\s*/)[0]
      .replace(/\s*[-–]\s*$/, "")
      .trim() || null
  );
}
