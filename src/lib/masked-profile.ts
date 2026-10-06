import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/country";
import { formatPlace } from "@/lib/location";
import { marketplaceVisibleWhere } from "@/lib/access";
import { experienceLabel, experienceYears, type Span } from "@/lib/experience";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { buildCompletenessInput, buildCompletenessInputs } from "@/lib/onboarding";
import { computeProviderCompleteness } from "@/lib/completeness";
import { blurredPhotoDataUri } from "@/lib/masked-photo";

export const RATE_LOCKED_COPY = "Register free to see rates";

export const CARD_LOCK_COPY = "Name, employers and rates shown after you join";

export const EMPLOYER_LOCK_COPY = "Employer shown after you join";

export function visitorPreviewWhere() {
  const base = marketplaceVisibleWhere();
  return {
    ...base,
    preview_hidden_at: null,
    person: {
      ...base.person,
      photo_url: undefined,
    },
  };
}

const MIN_NEEDLE = 3;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GENERIC_COMPANY_WORDS = new Set([
  "the", "and", "for", "inc", "llc", "ltd", "limited", "corp", "corporation",
  "company", "co", "group", "holdings", "partners", "services", "solutions",
  "systems", "technologies", "technology", "consulting", "consultants",
  "international", "global", "worldwide", "associates", "enterprises",
  "industries", "plc", "gmbh", "sa", "ag", "bv", "nv", "pty", "pte", "llp",
  "university", "college", "institute", "school",
]);

export function needlesFrom(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const raw of values) {
    const v = raw?.trim();
    if (!v) continue;
    if (v.length >= MIN_NEEDLE) out.add(v);
    for (const word of v.split(/[^\p{L}\p{N}&]+/u)) {
      const w = word.trim();
      if (w.length < MIN_NEEDLE) continue;
      if (GENERIC_COMPANY_WORDS.has(w.toLowerCase())) continue;
      out.add(w);
    }
  }
  return [...out];
}

export function scrub(
  text: string | null | undefined,
  needles: string[]
): string | null {
  const t = text?.trim();
  if (!t) return null;
  for (const n of needles) {
    if (n.length < MIN_NEEDLE) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(n)}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(t)) return null;
  }
  return t;
}

/* ── THE SHAPES ────────────────────────────────────────────────────────── */

/** READ THE FIELD LIST AS A WHITELIST. Anything a visitor may not have is */
export type MaskedCard = {
  /** Opaque; used only to build the preview link. Carries no identity. */
  id: string;
  /** The provider's own title (`Person.title`), soft-capped by the caller. */
  title: string;
  /** STATE + COUNTRY — Scott's answer 7. Never a city, never a street. */
  location: string | null;
  /** The resolved country name, for the country filter and the card line. */
  country: string | null;
  countryCode: string | null;
  /** "30 years", or null — `experienceLabel` never asserts "0 years". */
  experience: string | null;
  /** Whole years, for the experience filter. `null` when nothing is measurable. */
  experienceYears: number | null;
  /** The Search Score, COMPUTED. See `searchScoreFor` for why not the column. */
  score: number;
  /** In-role skill names only (`E517`). The card shows up to 3. */
  skills: string[];
  skillCount: number;
  certificationCount: number;
  /** Industry names from PROJECTS that have one. Never invented. */
  industries: string[];
  /** THE ONE DELIBERATE EXCEPTION TO "THE MASK IS THE SELECT" */
  photoBlur: string | null;
};

export type MaskedEmployerRow = {
  id: string;
  /** The role the member played. A title is not an identity. */
  roleTitle: string | null;
  dates: string | null;
  /** THE BADGE SHOWS HERE TOO , WS-C) */
  validated: boolean;
  /** Projects under this employer, scrubbed; industry only where populated. */
  lines: {
    id: string;
    roleTitle: string | null;
    dates: string | null;
    industry: string | null;
    validated: boolean;
  }[];
};

export type MaskedProfile = MaskedCard & {
  /** Scrubbed, or null. See `scrub`. */
  summary: string | null;
  /** The year only — never a full date, which narrows a person down. */
  memberSince: number | null;
  certifications: string[];
  /** Degree and field ONLY. `Education.institution` is NEVER selected. */
  education: string[];
  employers: MaskedEmployerRow[];
  /** Titles only (Scott's answer 10): no price, no cover image. */
  packages: string[];
  learnPaths: string[];
  languages: string[];
  specializations: string[];
};

/** THE MOCKUP'S "VERIFIED SKILLS 12" IS NOT BUILT, ON PURPOSE */

/* ── THE SEARCH SCORE ────────────────────────────────────────────────── */

/** IT IS COMPUTED, NOT READ FROM `ProviderProfile.completeness`, AND THAT */
export async function searchScoreFor(profileId: string): Promise<number> {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProviderCompleteness(input) : 0;
}

/* ── SHARED MAPPING ────────────────────────────────────────────────────── */

/** The dated-span list a profile's experience is measured from. */
function spansOf(p: {
  employers: { start_date: Date | null; end_date: Date | null; is_current: boolean }[];
  projects: { start_date: Date | null; end_date: Date | null; is_current: boolean }[];
}): Span[] {
  return [...p.employers, ...p.projects].map((r) => ({
    start: r.start_date,
    end: r.end_date,
    isCurrent: r.is_current,
  }));
}

/** "2019 – 2024", "2017 – Present", "Started 2019", or null. */
export function yearRange(
  start: Date | null,
  end: Date | null,
  isCurrent: boolean
): string | null {
  const s = start?.getUTCFullYear();
  if (!s) return null;
  if (end) return `${s} – ${end.getUTCFullYear()}`;
  // and is already what `lib/date-range-label.ts` prints signed in.
  return isCurrent ? `${s} – Present` : `Started ${s}`;
}

/** Title soft-cap, reusing `/explore`'s measured 42 (see `lib/explore.ts`). */
export const TITLE_CAP = 42;

export function capTitle(t: string): string {
  const s = t.trim().replace(/\s+/g, " ");
  if (s.length <= TITLE_CAP) return s;
  const head = s.slice(0, TITLE_CAP);
  const sp = head.lastIndexOf(" ");
  return (sp > 0 ? head.slice(0, sp) : head).replace(/[\s,;:/&|-]+$/, "") + "…";
}

/* ── THE GRID — BROWSE TALENT ─────────────────────────────────────────── */

/** 12 per page, then "Show more" (the brief). */
export const BROWSE_PAGE_SIZE = 12;

export type BrowseFilters = {
  /** Free text over title, overview, skills and catalog branch. */
  q?: string;
  /** ISO-2. */
  country?: string;
  /** Minimum whole years. */
  minYears?: number;
  /** How many to return. Pagination is "take more", so this grows. */
  take?: number;
};

/** The same text filter `/explore` already uses, kept as ONE shape so the */
function textFilter(q: string) {
  const like = { contains: q, mode: "insensitive" as const };
  return {
    OR: [
      { person: { title: like } },
      { overview: like },
      { skills: { some: { skill: { name: like } } } },
      { roleType: { name: like } },
      { roleType: { display: like } },
      { pillar: { name: like } },
    ],
  };
}

/** THE PUBLIC GRID. Returns masked cards and a `hasMore` flag. */
export async function browseTalent(
  f: BrowseFilters = {}
): Promise<{ cards: MaskedCard[]; hasMore: boolean }> {
  const take = f.take ?? BROWSE_PAGE_SIZE;
  const q = f.q?.trim();
  const base = visitorPreviewWhere();
  const where = {
    ...base,
    ...(q ? textFilter(q) : {}),
    ...(f.country
      ? {
          person: {
            ...base.person,
            site: { addresses: { some: { country_code: f.country.toUpperCase() } } },
          },
        }
      : {}),
  };

  // WHY THIS PAGES AT THE DATABASE AND ORDERS ON THE CACHED COLUMN
  const rows = await prisma.providerProfile.findMany({
    where,
    // (the brief: *"No total count of members unless it is true and Scott has
    take: take + 1,
    orderBy: [{ completeness: "desc" }, { updated_at: "desc" }, { id: "asc" }],
    select: {
      id: true,
      // NOTE WHAT IS ABSENT: no `person.first_name`, no `last_name`, no
      person: {
        select: {
          title: true,
          photo_url: true,
          site: {
            select: {
              addresses: {
                select: { state: true, country: true, country_code: true },
                take: 1,
              },
            },
          },
        },
      },
      roles: { select: { role_type_id: true } },
      skills: { select: { skill: { select: { name: true, role_type_id: true } } } },
      employers: { select: { start_date: true, end_date: true, is_current: true } },
      projects: {
        select: {
          start_date: true,
          end_date: true,
          is_current: true,
          industry: { select: { name: true } },
        },
      },
      _count: { select: { certifications: true } },
    },
  });

  const hasMore = rows.length > take;
  const page = rows.slice(0, take);

  // ONE QUERY FOR EVERY SCORE ON THE PAGE — `buildCompletenessInputs`
  const inputs = await buildCompletenessInputs(page.map((r) => r.id));

  // THE BLURS ARE MADE ONCE, IN PARALLEL, BEFORE THE MAP . The mapper
  const blurs = new Map<string, string | null>(
    await Promise.all(
      page.map(
        async (r) => [r.id, await blurredPhotoDataUri(r.person.photo_url)] as [string, string | null],
      ),
    ),
  );

  const cards: MaskedCard[] = page.map((p) => {
    const addr = p.person.site?.addresses[0];
    const country = countryName(addr?.country_code, addr?.country);
    const shown = shownSkills(
      selectedRoleIds(p),
      p.skills,
      (s) => s.skill.role_type_id
    );
    const spans = spansOf(p);
    const label = experienceLabel(spans);
    // not treat "we cannot tell" as "zero years", which would silently hide
    const years = label ? experienceYears(spans) : null;
    const input = inputs.get(p.id);
    return {
      id: p.id,
      title: capTitle(p.person.title ?? ""),
      // STATE + COUNTRY (Scott's answer 7) — the CITY IS DELIBERATELY NOT
      location: formatPlace(addr?.state, country),
      country,
      countryCode: addr?.country_code ?? null,
      experience: label,
      experienceYears: years,
      score: input ? computeProviderCompleteness(input) : 0,
      skills: shown.map((s) => s.skill.name),
      skillCount: shown.length,
      certificationCount: p._count.certifications,
      // ONLY WHERE POPULATED (Scott's answer 6). Measured: 3 of 21 projects
      industries: [
        ...new Set(
          p.projects
            .map((pr) => pr.industry?.name)
            .filter((n): n is string => Boolean(n))
        ),
      ],
      photoBlur: blurs.get(p.id) ?? null,
    };
  });

  // THE EXPERIENCE FILTER IS APPLIED AFTER THE PAGE, AND THAT IS A KNOWN
  const filtered =
    f.minYears && f.minYears > 0
      ? cards.filter((c) => (c.experienceYears ?? 0) >= f.minYears!)
      : cards;

  return { cards: filtered, hasMore };
}

/* ── THE SINGLE MASKED PROFILE — WHAT A SHARE LINK OPENS ─────────────── */

/** Null when the profile does not exist, is not marketplace-visible, or its */
export async function getMaskedProfile(
  profileId: string
): Promise<MaskedProfile | null> {
  const p = await prisma.providerProfile.findFirst({
    where: { id: profileId, ...visitorPreviewWhere() },
    select: {
      id: true,
      overview: true,
      // THE NAME IS SELECTED ONLY TO BE A SCRUB NEEDLE AND IS NEVER
      person: {
        select: {
          first_name: true,
          last_name: true,
          // SPENT, NOT RETURNED — see `MaskedCard.photoBlur`. The
          photo_url: true,
          title: true,
          created_at: true,
          site: {
            select: {
              addresses: {
                select: { state: true, country: true, country_code: true },
                take: 1,
              },
            },
          },
        },
      },
      roles: { select: { role_type_id: true } },
      /* No verification column exists — see the note on `MaskedProfile`. */
      skills: { select: { skill: { select: { name: true, role_type_id: true } } } },
      specializations: { select: { specialization: { select: { name: true } } } },
      certifications: { select: { name: true } },
      // DEGREE AND FIELD ONLY — `institution` IS NOT IN THIS SELECT.
      education: { select: { id: true, degree: true, field: true } },
      employers: {
        /* `name` IS A NEEDLE ONLY. See the `person` note above. */
        select: {
          id: true,
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          /* `E748` WS-C — the badge, as a boolean. No date, no domain. */
          validation_status: true,
          projects: {
            select: {
              id: true,
              client_name: true,
              role_title: true,
              name: true,
              start_date: true,
              end_date: true,
              is_current: true,
              validation_status: true,
              industry: { select: { name: true } },
            },
          },
        },
        orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
      },
      projects: {
        select: {
          id: true,
          client_name: true,
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          validation_status: true,
          industry: { select: { name: true } },
        },
      },
      languages: { select: { name: true } },
      serviceProducts: {
        where: { status: "PUBLISHED" },
        select: { title: true },
      },
    },
  });
  if (!p) return null;

  // EVERY NEEDLE, ASSEMBLED BEFORE ANY TEXT IS EMITTED — the member's own
  const needles = needlesFrom([
    p.person.first_name,
    p.person.last_name,
    `${p.person.first_name ?? ""} ${p.person.last_name ?? ""}`,
    ...p.employers.map((e) => e.name),
    ...p.employers.flatMap((e) => e.projects.map((pr) => pr.client_name)),
    ...p.projects.map((pr) => pr.client_name),
  ]);

  const addr = p.person.site?.addresses[0];
  const country = countryName(addr?.country_code, addr?.country);
  const shown = shownSkills(selectedRoleIds(p), p.skills, (s) => s.skill.role_type_id);
  const spans = spansOf(p);

  // SOLO PROJECTS — ONES NO EMPLOYER CLAIMS — BECOME THEIR OWN WORK-HISTORY
  const attached = new Set(p.employers.flatMap((e) => e.projects.map((pr) => pr.id)));
  const solo = p.projects.filter((pr) => !attached.has(pr.id));

  /* One photo, one blur. Awaited here because this mapper already is. */
  const photoBlur = await blurredPhotoDataUri(p.person.photo_url);

  return {
    id: p.id,
    photoBlur,
    title: capTitle(p.person.title ?? ""),
    location: formatPlace(addr?.state, country),
    country,
    countryCode: addr?.country_code ?? null,
    experience: experienceLabel(spans),
    experienceYears: experienceLabel(spans) ? experienceYears(spans) : null,
    score: await searchScoreFor(p.id),
    skills: shown.map((s) => s.skill.name),
    skillCount: shown.length,
    certificationCount: p.certifications.length,
    industries: [
      ...new Set(
        [...p.projects, ...p.employers.flatMap((e) => e.projects)]
          .map((pr) => pr.industry?.name)
          .filter((n): n is string => Boolean(n))
      ),
    ],
    /* SCRUBBED, AND DROPPED WHOLE IF IT CANNOT BE SCRUBBED (see `scrub`). */
    summary: scrub(p.overview, needles),
    memberSince: p.person.created_at?.getUTCFullYear() ?? null,
    certifications: p.certifications.map((c) => c.name),
    /* "Bachelor of Science, Business Administration" — no school. */
    education: p.education
      .map((e) => [e.degree, e.field].filter(Boolean).join(", "))
      .filter((s) => s.length > 0),
    employers: p.employers.map((e) => ({
      id: e.id,
      // A role title can itself name the employer ("Consultant, Ceres"), so
      roleTitle: scrub(e.role_title, needles),
      dates: yearRange(e.start_date, e.end_date, e.is_current),
      validated: e.validation_status === "VALIDATED",
      lines: e.projects.map((pr) => ({
        id: pr.id,
        roleTitle: scrub(pr.role_title ?? pr.name, needles),
        dates: yearRange(pr.start_date, pr.end_date, pr.is_current),
        industry: pr.industry?.name ?? null,
        validated: pr.validation_status === "VALIDATED",
      })),
    })).concat(soloProjectRows(solo, needles)),
    packages: p.serviceProducts.map((s) => s.title),
    /* Filled by the caller, which owns the Learn read. */
    learnPaths: [],
    languages: p.languages.map((l) => l.name),
    specializations: p.specializations.map((s) => s.specialization.name),
  };
}

/** Solo projects, as their own masked rows (no employer claims them). */
export function soloProjectRows(
  projects: {
    id: string;
    role_title: string | null;
    name: string;
    start_date: Date | null;
    end_date: Date | null;
    is_current: boolean;
    validation_status: string;
    industry: { name: string } | null;
  }[],
  needles: string[]
): MaskedEmployerRow[] {
  return projects.map((pr) => ({
    id: pr.id,
    roleTitle: scrub(pr.role_title ?? pr.name, needles),
    dates: yearRange(pr.start_date, pr.end_date, pr.is_current),
    validated: pr.validation_status === "VALIDATED",
    lines: [],
  }));
}

/** THE COUNTRY FILTER'S OPTIONS, MEASURED NOT ENUMERATED */
export async function previewCountries(): Promise<
  { code: string; name: string; count: number }[]
> {
  const rows = await prisma.providerProfile.findMany({
    where: visitorPreviewWhere(),
    select: {
      person: {
        select: {
          site: {
            select: {
              addresses: { select: { country: true, country_code: true }, take: 1 },
            },
          },
        },
      },
    },
  });
  const tally = new Map<string, { code: string; name: string; count: number }>();
  for (const r of rows) {
    const a = r.person.site?.addresses[0];
    const code = a?.country_code?.toUpperCase();
    if (!code) continue;
    const name = countryName(code, a?.country) ?? code;
    const hit = tally.get(code);
    if (hit) hit.count += 1;
    else tally.set(code, { code, name, count: 1 });
  }
  return [...tally.values()].sort((x, y) => x.name.localeCompare(y.name));
}
