import { prisma } from "@/lib/prisma";
import { buyerDisplay } from "@/lib/buyer-display";
import { viewerIsPlus } from "@/lib/plus";
/* THE ONE RESOLVER (`E728` WS-B). */
import { countryName } from "@/lib/country";
import { canSeeRate } from "@/lib/rate-visibility";
import type { Viewer } from "@/lib/access";
import { marketplaceVisibleWhere } from "@/lib/access";
import { capitalizeName } from "@/lib/display";
import { formatPlace } from "@/lib/location";
import { formatRate } from "@/lib/types";

/** THE PUBLIC TEASER SEARCH (E032/E033) — what an anonymous visitor is allowed */

export type TeaserProvider = {
  /** Opaque to the client — used only to build a post-login callback URL. */
  id: string;
  /** MASKED: first name only, capitalized (E006). */
  firstName: string;
  /** The card's one-line title: the provider's OWN headline, soft-capped. */
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
  /** The buyer's company as buyerDisplay prints it ("Confidential buyer" when withheld). */
  company: string | null;
  /** Set only for signed-in viewers and named companies — the /companies link. */
  companyId: string | null;
  location: string | null;
  skills: string[];
  budget: string | null;
};

/** How many teaser cards a visitor sees before the gate. */
export const TEASER_LIMIT = 4;

/** Free-text over the fields a person would actually search: what the provider */
function providerTextFilter(q: string) {
  const like = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      // THIS FILTER WAS NOT UPDATED, so every search on the public `/explore`
      { person: { title: like } },
      { overview: like },
      { skills: { some: { skill: { name: like } } } },
      { keywords_text: like },
      { roleType: { name: like } },
      { roleType: { display: like } },
      { pillar: { name: like } },
    ],
  };
}

export async function searchProvidersTeaser(
  q: string,
  take = TEASER_LIMIT,
  /** THE VIEWER, FOR THE RATE AND NOTHING ELSE */
  viewer?: Viewer | null
): Promise<{ cards: TeaserProvider[]; total: number }> {
  const term = q.trim();
  const where = {
    ...marketplaceVisibleWhere(),
    ...(term ? providerTextFilter(term) : {}),
  };

  // all N experts" and N has to be the number behind this search or it is a
  const [rows, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      take,
      // THE SORT WAS INVERTED, AND FLIPPING IT WOULD ALSO BE WRONG (
      orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
      select: {
        id: true,
        /* `headline` COLUMN IS GONE (`E595` WS-B) — the title is on the person. */
        hourly_rate_cents: true,
        rate_min_cents: true,
        rate_max_cents: true,
        currency: true,
        validation_status: true,
        completeness: true,
        onsite_rate_cents: true,
        remote_rate_cents: true,
        // WS-2 pedigree. `_count` rather than fetching the rows: the card shows
        _count: { select: { employers: true, projects: true } },
        education: { select: { institution: true } },
        // NOTE the absence of `last_name`. See the header comment.
        person: {
          select: {
            first_name: true,
            // — so a provider browsing `/explore` still sees
            user_id: true,
            /* `title` — the profile's title lives on the PERSON since `E595` WS-B. */
            title: true,
            photo_url: true,
            site: {
              select: {
                addresses: {
                  /* `country_code` JOINS THE SELECT (`E728` WS-B ruling 1). */
                  select: { city: true, country: true, country_code: true },
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
    // VALIDATED FIRST, applied to the returned page — see the sort note above
    cards: rows
      .slice()
      .sort((a, b) =>
        Number(b.validation_status === "VALIDATED") -
        Number(a.validation_status === "VALIDATED")
      )
      .map((p) => {
      const addr = p.person.site?.addresses[0];
      return {
        id: p.id,
        firstName: capitalizeName(p.person.first_name),
        // THE DTO KEY STAYS `headline`; the SOURCE is `Person.title` since
        title: cardTitle(p.person.title ?? ""),
        headline: p.person.title ?? "",
        university: headlineSchool(p.education.map((e) => e.institution)),
        employerCount: p._count.employers,
        projectCount: p._count.projects,
        // READER SWITCHED ( WS-B) — the name comes from the code where there is
        location: formatLocation(addr?.city, countryName(addr?.country_code, addr?.country)),
        skills: p.skills.map((s) => s.skill.name),
        // ALL FIVE FIELDS THE GATE ACCEPTS ( WS-4) — `rateLabel` read
        // function the profile calls, never a second copy of its condition. A
        rate: canSeeRate({ isOwner: p.person.user_id === viewer?.userId, viewer })
          ? rateLabel(
              p.rate_min_cents,
              p.rate_max_cents,
              p.hourly_rate_cents,
              p.currency
            ) ??
            (p.onsite_rate_cents != null
              ? `${rateLabel(p.onsite_rate_cents, null, null, p.currency)} onsite`
              : p.remote_rate_cents != null
                ? `${rateLabel(p.remote_rate_cents, null, null, p.currency)} remote`
                : null)
          : null,
        validated: p.validation_status === "VALIDATED",
        photoUrl: p.person.photo_url,
      };
    }),
  };
}

/** The other side of the toggle. */
export async function searchWorkTeaser(
  q: string,
  take = TEASER_LIMIT,
  viewer: Viewer | null = null
): Promise<{ cards: TeaserWork[]; total: number }> {
  const isPlus = viewer ? await viewerIsPlus(viewer) : false;
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
        company_visibility: true,
        company_code_name: true,
        buyer: { select: { user_id: true, company: { select: { id: true, name: true } } } },
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
      ...(() => {
        const d = buyerDisplay(
          { visibility: w.company_visibility, codeName: w.company_code_name, company: w.buyer?.company ?? null },
          { signedIn: !!viewer, isOwner: !!viewer && viewer.userId === w.buyer?.user_id, isAdmin: !!viewer?.isSystemAdmin, isPlus }
        );
        return { company: d.label, companyId: d.companyId };
      })(),
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

/** city is missing, which several seeded addresses are. A dangling comma is how */
function formatLocation(
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  return formatPlace(city, country);
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


/** The card title — the provider's headline, softly capped. */
export const TITLE_SOFT_CAP = 42;

function cardTitle(headline: string): string {
  const t = headline.trim().replace(/\s+/g, " ");
  if (t.length <= TITLE_SOFT_CAP) return t;
  // Cut at the last word boundary inside the cap, so no word is bisected. A
  const head = t.slice(0, TITLE_SOFT_CAP);
  const lastSpace = head.lastIndexOf(" ");
  const body = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return body.replace(/[\s,;:/&|-]+$/, "") + "\u2026";
}

/** The headline school. */
const SCHOOL_NAME =
  /\b(universi\w*|college|institute|instituto|school|academy|polytechnic|seminary|hochschule|iit|iim|nit)\b/i;

function headlineSchool(institutions: string[]): string | null {
  return institutions.find((i) => i?.trim() && SCHOOL_NAME.test(i))?.trim() ?? null;
}
