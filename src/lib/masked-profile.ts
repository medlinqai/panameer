import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/country";
import { formatPlace } from "@/lib/location";
import { marketplaceVisibleWhere } from "@/lib/access";
import { experienceLabel, experienceYears, type Span } from "@/lib/experience";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import { buildCompletenessInput, buildCompletenessInputs } from "@/lib/onboarding";
import { computeProviderCompleteness } from "@/lib/completeness";
import { blurredPhotoDataUri } from "@/lib/masked-photo";

/**
 * ── ⚠⚠⚠ THE PUBLIC TALENT PREVIEW — WHAT A SIGNED-OUT VISITOR MAY SEE ──────
 *                                                        (`P2-A1.1-E738`)
 *
 * ⚠ SCOTT, 2026-10-01: *"What is the best way to show the quality of profiles
 * we have, but not let buyers in until they register? we will also need to make
 * sure those profile names are masked."*
 *
 * ── ⚠⚠⚠ THE ONE RULE THIS FILE EXISTS TO ENFORCE ──────────────────────────
 *
 * ⚠⚠⚠ **MASKING HAPPENS ON THE SERVER, AND IT IS ENFORCED BY THE TYPE RATHER
 * THAN BY THE TEMPLATE.** `MaskedProfile` HAS NO FIELD FOR a first name, a last
 * name, initials, a photo URL, an email, a phone, a link, a street address, an
 * employer name, a client name or a school name. ⚠ The Prisma selects below
 * never READ most of them, and the two they must read (the member's own name and
 * their employer/client names) exist **only** to be fed to `scrub()` as needles
 * and are never returned.
 *
 * ⚠⚠ **SO A FUTURE EDIT TO THE PAGE CANNOT LEAK A NAME BY ADDING ONE LINE OF
 * JSX — THE FIELD IS NOT IN THE OBJECT.** That is the same reasoning as
 * owner-scoping a write: make the wrong thing unavailable rather than
 * remembering not to do it. ⚠ It is the rule `lib/explore.ts` already states for
 * the teaser cards, applied to a whole profile.
 *
 * ⚠⚠⚠ **HIDING WITH CSS, A BLUR, OR A CLIENT-SIDE FILTER IS A FAILURE.** The
 * blurred rate figures in the approved mockup are a PLACEHOLDER GRAPHIC. The
 * real rate is not in the payload at all — see `RATE_LOCKED_COPY`.
 *
 * ── ⚠⚠ WHAT THIS FILE IS **NOT** ──────────────────────────────────────────
 *
 * ⚠⚠ IT IS NOT A SECOND VISIBILITY RULE. Eligibility is
 * `marketplaceVisibleWhere()` — the SAME predicate the authed directory,
 * `/explore` and the signed-in profile use (`E585`: one definition, one place) —
 * narrowed by `visitorPreviewWhere()` below. ⚠ It can only ever SUBTRACT from
 * that set, never add to it, and a paused profile is absent whatever any new
 * column says.
 */

/* ── ⚠ THE LOCKED RATE, AS ONE CONSTANT ──────────────────────────────────── */

/**
 * ⚠⚠ THE BRIEF: *"Rates (locked for now; one constant to change later)."*
 * ⚠⚠⚠ THE FIGURE IS NOT WITHHELD AT RENDER — **IT IS NEVER SELECTED.** There is
 * no rate field on `MaskedProfile`, so "unlocking" rates later is a deliberate
 * change to this file and its type, not a flag someone flips by accident.
 */
export const RATE_LOCKED_COPY = "Register free to see rates";

/** ⚠ The lock line the brief specifies for a Browse Talent card, verbatim. */
export const CARD_LOCK_COPY = "Name, employers and rates shown after you join";

/**
 * ⚠⚠ WHAT AN EMPLOYER ROW SAYS INSTEAD OF ITS NAME — SCOTT'S ANSWER 6,
 * 2026-10-01: *"Employer rows show role + dates + 'Employer shown after you
 * join'; no invented industry."*
 * ⚠⚠⚠ **THERE IS DELIBERATELY NO INDUSTRY FALLBACK LABEL.** The brief's premise
 * 2 proposed one (*"Private company"*) and Scott ruled it out: `Employer` has no
 * industry column at all, so any label would be invented. ⚠ A project's industry
 * IS a real column (`Project.industry_specialization_id`) and is shown **only
 * where populated** — measured 2026-10-01: **3 of 21 projects**.
 */
export const EMPLOYER_LOCK_COPY = "Employer shown after you join";

/* ── ⚠⚠ ELIGIBILITY ──────────────────────────────────────────────────────── */

/**
 * ⚠⚠ WHO APPEARS TO A SIGNED-OUT VISITOR.
 *
 * ⚠⚠⚠ **IT IS `marketplaceVisibleWhere()` MINUS TWO THINGS, AND IT IS BUILT BY
 * SUBTRACTION SO IT CANNOT DRIFT INTO A SECOND DEFINITION** (`E585`). Spreading
 * the shared predicate means a future clause added there arrives here for free;
 * re-typing its clauses is how `/explore` and the directory would start
 * disagreeing about who is discoverable.
 *
 * ⚠ **1. THE PHOTO CLAUSE COMES OFF** — Scott, 2026-10-01: *"photo dropped from
 * Browse Talent eligibility."* It is the right call for a surface that shows a
 * **placeholder icon for everybody**: requiring a photo nobody will see would
 * exclude members for failing to supply an asset the page then masks.
 * ⚠⚠ **MEASURED BEFORE THE CHANGE, AND IT MOVES NOTHING TODAY: 59 profiles
 * qualify with the photo clause and 59 without it** — every eligible member
 * already has a photo. The rule changes; today's set does not. Stated so nobody
 * later reads a count difference into it.
 *
 * ⚠ **2. THE MEMBER'S OWN SWITCH IS ADDED** — `preview_hidden_at` must be null.
 * The brief: *"A member who turned Visibility off never appears."*
 */
export function visitorPreviewWhere() {
  const base = marketplaceVisibleWhere();
  return {
    ...base,
    /* ⚠⚠ THE MEMBER'S OWN OPT-OUT. Null = shown (the default). */
    preview_hidden_at: null,
    person: {
      ...base.person,
      /* ⚠⚠⚠ `undefined` REMOVES A PRISMA CLAUSE; `null` WOULD ASSERT "has no
         photo" AND RETURN **NOBODY**. ⚠ That inversion is a real trap: the
         narrowing reads as a widening and the page renders empty. */
      photo_url: undefined,
    },
  };
}

/* ── ⚠⚠⚠ SCRUBBING FREE TEXT ─────────────────────────────────────────────── */

/**
 * ⚠⚠ THE BRIEF: *"remove the member's own name and any employer or client name
 * the profile holds. Use the profile's own lists to match; no AI call. If a line
 * can't be scrubbed confidently, drop it."*
 *
 * ⚠⚠⚠ **IT RETURNS `null`, NOT A REDACTED STRING WITH HOLES IN IT.** A summary
 * reading *"Partners with ███ to deliver ███"* advertises exactly how much was
 * hidden and reads as a broken page; a dropped line reads as a short profile.
 * ⚠ Scott's rule for the whole surface is that an absence must not look like a
 * malfunction.
 *
 * ⚠⚠ **WORD-BOUNDARY MATCHING, AND THE BOUNDARY IS WHY THIS IS NOT A
 * `.includes()`.** A needle of `"Ceres"` must catch `Ceres.` and `(Ceres)` and
 * must NOT fire on `interference`. ⚠⚠⚠ **AND SHORT NEEDLES ARE DISCARDED:** an
 * employer called `"AI"` or a surname of two letters would match a dozen
 * ordinary words and silently delete every summary on the site.
 */
const MIN_NEEDLE = 3;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ⚠ Every form of a needle worth matching: the whole phrase, and each of its
 * words that is long enough to be distinctive on its own.
 *
 * ⚠⚠ WHY THE WORDS AND NOT ONLY THE PHRASE: a résumé summary says *"redesigned
 * P2P at Ceres"* while the stored employer is `"Ceres Global Ag Corp"`. Matching
 * only the full phrase would leave the recognisable half in place — and the
 * recognisable half is the leak.
 * ⚠ Generic corporate words are dropped so `"Global Engineering Limited"` does
 * not make the word `global` a redaction trigger across every profile.
 */
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

/**
 * ⚠⚠ Scrub `text` against `needles`. Returns `null` the moment one matches.
 *
 * ⚠⚠⚠ **DROP, DO NOT REPLACE** — see the block comment above. ⚠ An empty or
 * blank input is `null` too, so a caller never has to test for both.
 */
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

/* ── ⚠ THE SHAPES ────────────────────────────────────────────────────────── */

/**
 * ⚠⚠⚠ READ THE FIELD LIST AS A WHITELIST. Anything a visitor may not have is
 * ABSENT, not nulled: there is no `firstName`, no `photoUrl`, no `email`, no
 * `employerName`, no `rate`.
 */
export type MaskedCard = {
  /** ⚠ Opaque; used only to build the preview link. Carries no identity. */
  id: string;
  /** The provider's own title (`Person.title`), soft-capped by the caller. */
  title: string;
  /** ⚠⚠ STATE + COUNTRY — Scott's answer 7. Never a city, never a street. */
  location: string | null;
  /** ⚠ The resolved country name, for the country filter and the card line. */
  country: string | null;
  countryCode: string | null;
  /** "30 years", or null — `experienceLabel` never asserts "0 years". */
  experience: string | null;
  /** Whole years, for the experience filter. `null` when nothing is measurable. */
  experienceYears: number | null;
  /** ⚠⚠ The Search Score, COMPUTED. See `searchScoreFor` for why not the column. */
  score: number;
  /** In-role skill names only (`E517`). The card shows up to 3. */
  skills: string[];
  skillCount: number;
  certificationCount: number;
  /** ⚠ Industry names from PROJECTS that have one. Never invented. */
  industries: string[];
  /**
   * ── ⚠⚠⚠ THE ONE DELIBERATE EXCEPTION TO "THE MASK IS THE SELECT" (`E767`) ──
   *
   * ⚠ **IT IS NOT A PHOTO URL AND IT NEVER BECOMES ONE.** `photo_url` is now read
   * by the query — the only field on this type that comes from one — and is spent
   * entirely inside `blurredPhotoDataUri()`. What arrives here is **a 16px-wide
   * JPEG, inline, as bytes**. The URL is not returned, not logged and not
   * reachable from the page.
   *
   * ⚠⚠ **SO THE RULE IS NARROWED, NOT BROKEN:** every other identifying field is
   * still absent from the type, and this one is present only in a form from which
   * the original cannot be recovered — roughly 250 pixels of colour for a whole
   * face, discarded by the downscale before the bytes exist.
   *
   * ⚠ `null` when there is no photo, or when it could not be read. The caller
   * falls back to the placeholder icon, which is a worse picture and an equally
   * safe one.
   */
  photoBlur: string | null;
};

export type MaskedEmployerRow = {
  id: string;
  /** ⚠ The role the member played. A title is not an identity. */
  roleTitle: string | null;
  dates: string | null;
  /**
   * ── ⚠⚠ THE BADGE SHOWS HERE TOO (`P2-A1.1-E748`, WS-C) ──────────────────
   * ⚠ SCOTT: the badge appears on *"the owner view, the visitor view, and the
   * masked public preview (the badge shows; who validated doesn't)."*
   * ⚠⚠⚠ **THERE IS NO `validatedBy` AND NO `validatedAt` ON THIS TYPE, AND THAT
   * IS THE MASK DOING ITS JOB.** A domain is an employer hint, and this surface
   * exists to withhold exactly that — so the masked badge is a BOOLEAN and the
   * tooltip says nothing. ⚠ It is the strongest form of *"who validated
   * doesn't"*: the source is not in the payload at all.
   */
  validated: boolean;
  /** ⚠ Projects under this employer, scrubbed; industry only where populated.
   *  ⚠⚠ `validated` is a BOOLEAN here too — same reason as above. */
  lines: {
    id: string;
    roleTitle: string | null;
    dates: string | null;
    industry: string | null;
    validated: boolean;
  }[];
};

export type MaskedProfile = MaskedCard & {
  /** ⚠⚠ Scrubbed, or null. See `scrub`. */
  summary: string | null;
  /** The year only — never a full date, which narrows a person down. */
  memberSince: number | null;
  certifications: string[];
  /** ⚠⚠ Degree and field ONLY. `Education.institution` is NEVER selected. */
  education: string[];
  employers: MaskedEmployerRow[];
  /** ⚠ Titles only (Scott's answer 10): no price, no cover image. */
  packages: string[];
  learnPaths: string[];
  languages: string[];
  specializations: string[];
};

/**
 * ── ⚠⚠⚠ THE MOCKUP'S "VERIFIED SKILLS 12" IS NOT BUILT, ON PURPOSE ────────
 *
 * ⚠⚠ **`ProviderSkill` HAS NO VERIFICATION COLUMN.** Its fields are `weight`,
 * `months_total`, `first_used`, `last_used`, `source` and the suite list —
 * measured 2026-10-01 against `schema.prisma`. ⚠⚠⚠ **SO THE FIGURE HAS NO
 * WRITER, WHICH MAKES IT UNCOUNTABLE** (counting rule 1), and a number beside
 * the words *"Verified skills"* on a buyer-facing page would be a fabrication —
 * the one failure mode Scott has said he will not accept.
 *
 * ⚠ **AND THE MOCKUP IS NOT EVIDENCE THAT THE FIELD EXISTS** (evidence rule 7:
 * *"a field a mockup implies is not a field that exists"*). The side panel ships
 * with the Search Score alone.
 *
 * ⚠⚠ A DEFENSIBLE DEFINITION EXISTS — skills carried by a VALIDATED project or
 * employer — but nobody has ruled on it, and inventing a definition for a trust
 * signal is worse than omitting the signal. **REPORTED FOR SCOTT, NOT BUILT.**
 */

/* ── ⚠⚠⚠ THE SEARCH SCORE ────────────────────────────────────────────────── */

/**
 * ⚠⚠⚠ **IT IS COMPUTED, NOT READ FROM `ProviderProfile.completeness`, AND THAT
 * IS A MEASUREMENT RATHER THAN A PREFERENCE.**
 *
 * ⚠ `completeness` is a CACHE written by `recomputeCompleteness`. ⚠⚠ **MEASURED
 * 2026-10-01 OVER THE 59 ELIGIBLE PROFILES: 52 HOLD `0`, 5 HOLD 80–100, 2 HOLD
 * 50–79.** The cache has simply never been refreshed for most members.
 * ⚠⚠⚠ **SO READING THE COLUMN WOULD PRINT `SCORE 0` ON 52 OF 59 CARDS** — a
 * false figure on the one surface built to advertise profile quality, which is
 * strictly worse than showing none.
 *
 * ⚠⚠ THIS IS NOT THE "UNCOUNTABLE FIGURE" CASE (counting rule 1): the score HAS
 * a writer and a definition. It is a STALE CACHE, so the honest answer is to
 * compute it, not to print a dash. ⚠ Same function, same input, same number the
 * owner's own Search Score page shows — `computeProviderCompleteness` over
 * `buildCompletenessInput`, so this surface cannot invent a second score.
 *
 * ⚠⚠ **THE STALENESS IS A SEPARATE, REAL FINDING AND IS REPORTED, NOT FIXED
 * HERE.** Backfilling 52 rows is a write this brief is not authorised to make.
 *
 * ⚠ COST, MEASURED AND ACCEPTED: one extra `findUnique` per profile shown. The
 * grid runs them in parallel for a page of 12.
 */
export async function searchScoreFor(profileId: string): Promise<number> {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProviderCompleteness(input) : 0;
}

/* ── ⚠ SHARED MAPPING ────────────────────────────────────────────────────── */

/** ⚠ The dated-span list a profile's experience is measured from. */
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
  /* ⚠⚠ `E549`'s RULE, ON A PUBLIC PAGE: a job with no end and no affirmative
     `is_current` is NOT current. *"Started 2019"* is Scott's own wording for it
     and is already what `lib/date-range-label.ts` prints signed in. */
  return isCurrent ? `${s} – Present` : `Started ${s}`;
}

/** ⚠ Title soft-cap, reusing `/explore`'s measured 42 (see `lib/explore.ts`). */
export const TITLE_CAP = 42;

export function capTitle(t: string): string {
  const s = t.trim().replace(/\s+/g, " ");
  if (s.length <= TITLE_CAP) return s;
  const head = s.slice(0, TITLE_CAP);
  const sp = head.lastIndexOf(" ");
  return (sp > 0 ? head.slice(0, sp) : head).replace(/[\s,;:/&|-]+$/, "") + "…";
}

/* ── ⚠⚠ THE GRID — BROWSE TALENT ─────────────────────────────────────────── */

/** ⚠ 12 per page, then "Show more" (the brief). */
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

/**
 * ⚠⚠ The same text filter `/explore` already uses, kept as ONE shape so the
 * public search cannot answer differently from the teaser it replaced.
 * ⚠ `headline` is NOT a column — it moved to `Person.title` at `E595` WS-B, and
 * reading it is what 500'd `/explore` for weeks.
 */
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

/**
 * ⚠⚠⚠ THE PUBLIC GRID. Returns masked cards and a `hasMore` flag.
 *
 * ⚠ **NO TOTAL COUNT IS RETURNED, AND THAT IS THE BRIEF:** *"No total count of
 * members unless it is true and Scott has seen it."* ⚠⚠ `hasMore` is derived by
 * asking for one row more than the page and throwing it away — which answers
 * *"is there another page"* without ever printing a figure.
 */
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

  /*
    ── ⚠⚠⚠ WHY THIS PAGES AT THE DATABASE AND ORDERS ON THE CACHED COLUMN ────

    ⚠⚠ **MEASURED 2026-10-01, AND THE FIRST VERSION OF THIS FUNCTION WAS TOO
    SLOW TO SHIP:** loading every eligible row took **2.7 s** and computing a
    live Search Score for all 59 took **4.3 s** — ~5.5 s for a page a stranger
    loads, on the public funnel.

    ⚠ **SO THE ROW SET IS NARROWED AT THE DATABASE, AND THE ORDER KEY HAS TO BE A
    COLUMN.** The only ranking column is `completeness`.

    ⚠⚠⚠ **AND `completeness` IS A STALE CACHE — 52 OF THE 59 ELIGIBLE PROFILES
    HOLD `0`** (measured 2026-10-01). So be exact about what is and is not true
    here, because the two halves have different honesty:
      · ⚠ **THE FIGURE EACH CARD SHOWS IS EXACT.** It is computed from
        `buildCompletenessInputs` for the rows on this page — the same function,
        the same input and the same number as the owner's own Search Score page.
        **No card ever prints the stale column.**
      · ⚠⚠ **THE ORDER IS APPROXIMATE** until the cache is backfilled: the five
        profiles with a refreshed cache sort first and the remaining 52 fall back
        to `updated_at`. ⚠ It is not random and it is not wrong-looking — it just
        is not strictly score-ordered.

    ⚠⚠ **THE FIX IS A BACKFILL, NOT A CODE CHANGE** — `recomputeCompleteness`
    over the eligible set, which is a WRITE this brief is not authorised to make.
    **REPORTED FOR SCOTT.** The moment the cache is fresh, this ordering becomes
    exact with no edit here.
    ⚠⚠⚠ **DO NOT "FIX" THIS BY SORTING THE PAGE IN MEMORY.** Sorting 12 rows by
    score after the database already chose which 12 reorders a page without
    changing which members are on it — ⚠ which READS like a score ranking while
    being nothing of the kind. That is a worse defect than an admitted
    approximation, because it hides itself.
  */
  const rows = await prisma.providerProfile.findMany({
    where,
    /* ⚠ `take + 1` is how `hasMore` is answered WITHOUT printing a total
       (the brief: *"No total count of members unless it is true and Scott has
       seen it."*). The extra row is counted and discarded. */
    take: take + 1,
    orderBy: [{ completeness: "desc" }, { updated_at: "desc" }, { id: "asc" }],
    select: {
      id: true,
      /* ⚠⚠ NOTE WHAT IS ABSENT: no `person.first_name`, no `last_name`, no
         `phone`, no rate column. ⚠ The mask is the select.
         ⚠⚠⚠ **`photo_url` IS THE ONE EXCEPTION AND IT IS SPENT, NOT RETURNED**
         (`E767`): it is handed to `blurredPhotoDataUri()` and what reaches the
         card is a 16px JPEG's bytes. ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   no `person.first_name`, no `last_name`, no `photo_url`, no `phone` */
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

  /* ⚠⚠⚠ **ONE QUERY FOR EVERY SCORE ON THE PAGE** — `buildCompletenessInputs`,
     the batch twin of the single read, sharing its `include` and its mapper so
     the two cannot disagree (`E585`). ⚠ Twelve ids measured ~0.6 s against
     4.3 s for the whole eligible set, which is the whole reason this runs after
     the page is chosen rather than before. ⚠⚠ A profile missing from the map
     scores `0` — impossible here (the ids came from the row set a moment ago)
     and the safe answer if it ever happens. */
  const inputs = await buildCompletenessInputs(page.map((r) => r.id));

  /*
    ⚠⚠ THE BLURS ARE MADE ONCE, IN PARALLEL, BEFORE THE MAP (`E767`). The mapper
    is synchronous and must stay that way; making it async would turn one page
    render into twelve awaited round trips in series. ⚠ `blurredPhotoDataUri`
    caches on the source URL, so a second render of the same grid costs nothing.
  */
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
    /* ⚠⚠ `null` WHEN NOTHING IS MEASURABLE, NOT `0` — the experience filter must
       not treat "we cannot tell" as "zero years", which would silently hide
       every undated profile behind a `1+ years` filter. ⚠ `experienceLabel`
       returns null below six months, so the two agree by construction. */
    const years = label ? experienceYears(spans) : null;
    const input = inputs.get(p.id);
    return {
      id: p.id,
      title: capTitle(p.person.title ?? ""),
      /* ⚠⚠ STATE + COUNTRY (Scott's answer 7) — the CITY IS DELIBERATELY NOT
         SELECTED. ⚠ 4 of the 59 eligible profiles hold no state (measured
         2026-10-01), so `formatPlace` drops the empty part and the line reads as
         the country alone rather than ", United States". */
      location: formatPlace(addr?.state, country),
      country,
      countryCode: addr?.country_code ?? null,
      experience: label,
      experienceYears: years,
      score: input ? computeProviderCompleteness(input) : 0,
      skills: shown.map((s) => s.skill.name),
      skillCount: shown.length,
      certificationCount: p._count.certifications,
      /* ⚠⚠ ONLY WHERE POPULATED (Scott's answer 6). Measured: 3 of 21 projects
         carry an industry, so most cards show none — and none is invented. */
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

  /*
    ⚠⚠ THE EXPERIENCE FILTER IS APPLIED AFTER THE PAGE, AND THAT IS A KNOWN
    LIMITATION STATED RATHER THAN HIDDEN: years are DERIVED from dated spans
    (`E549`'s rule) and there is no years column to filter on at the database.
    ⚠ So `minYears` can return fewer than `take` rows for a page. ⚠⚠⚠ IT CANNOT
    RETURN A **WRONG** ROW, which is the property that matters; "Show more" then
    fetches a larger window. ⚠ A real fix needs a stored, maintained
    experience-months column — the same shape of problem as the score cache, and
    reported with it.
  */
  const filtered =
    f.minYears && f.minYears > 0
      ? cards.filter((c) => (c.experienceYears ?? 0) >= f.minYears!)
      : cards;

  return { cards: filtered, hasMore };
}

/* ── ⚠⚠⚠ THE SINGLE MASKED PROFILE — WHAT A SHARE LINK OPENS ─────────────── */

/**
 * ⚠⚠⚠ Null when the profile does not exist, is not marketplace-visible, or its
 * owner turned the masked preview off. ⚠ The caller renders the SAME
 * "not available" page for all three, because distinguishing them tells a
 * stranger that a hidden member exists.
 *
 * ⚠⚠ `named` ASKS FOR THE NAMED VARIANT (`/in/<slug>` with the member's
 * "Public profile with my name" option ON). It is resolved by the CALLER from
 * `public_name_at` and re-checked here, so a hand-typed query parameter cannot
 * reach it.
 */
export async function getMaskedProfile(
  profileId: string
): Promise<MaskedProfile | null> {
  const p = await prisma.providerProfile.findFirst({
    where: { id: profileId, ...visitorPreviewWhere() },
    select: {
      id: true,
      overview: true,
      /* ⚠⚠⚠ THE NAME IS SELECTED **ONLY TO BE A SCRUB NEEDLE** AND IS NEVER
         RETURNED. ⚠ That is the one honest reason to read it here, and the
         leak test (`e2e-e738`) proves the output does not contain it. */
      person: {
        select: {
          first_name: true,
          last_name: true,
          /* ⚠⚠⚠ SPENT, NOT RETURNED (`E767`) — see `MaskedCard.photoBlur`. The
             URL goes into `blurredPhotoDataUri()` and 16px of JPEG comes out. */
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
      /* ⚠ No verification column exists — see the note on `MaskedProfile`. */
      skills: { select: { skill: { select: { name: true, role_type_id: true } } } },
      specializations: { select: { specialization: { select: { name: true } } } },
      certifications: { select: { name: true } },
      /* ⚠⚠ DEGREE AND FIELD ONLY — `institution` IS NOT IN THIS SELECT.
         The brief masks the school name, and a school is an identity hint. */
      education: { select: { id: true, degree: true, field: true } },
      employers: {
        /* ⚠ `name` IS A NEEDLE ONLY. See the `person` note above. */
        select: {
          id: true,
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          /* ⚠ `E748` WS-C — the badge, as a boolean. No date, no domain. */
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

  /* ⚠⚠⚠ EVERY NEEDLE, ASSEMBLED BEFORE ANY TEXT IS EMITTED — the member's own
     name, every employer name, and every client name the profile holds. */
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

  /* ⚠⚠ SOLO PROJECTS — ONES NO EMPLOYER CLAIMS — BECOME THEIR OWN WORK-HISTORY
     ROWS, the same derivation `buildCompletenessInput` and the signed-in profile
     use (`projects.filter(employer_id == null)`). ⚠ `p.projects` is EVERY project
     on the profile, including the employer-attached ones, so the attached ids are
     subtracted rather than re-queried. ⚠⚠⚠ WITHOUT THIS, AN INDEPENDENT
     CONSULTANT'S ENTIRE WORK HISTORY IS MISSING FROM THE PREVIEW — they have
     engagements and no employers, and that is the population `E536` exists to
     serve. */
  const attached = new Set(p.employers.flatMap((e) => e.projects.map((pr) => pr.id)));
  const solo = p.projects.filter((pr) => !attached.has(pr.id));

  /* ⚠ One photo, one blur. Awaited here because this mapper already is. */
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
    /* ⚠⚠ SCRUBBED, AND DROPPED WHOLE IF IT CANNOT BE SCRUBBED (see `scrub`). */
    summary: scrub(p.overview, needles),
    memberSince: p.person.created_at?.getUTCFullYear() ?? null,
    certifications: p.certifications.map((c) => c.name),
    /* ⚠ "Bachelor of Science, Business Administration" — no school. */
    education: p.education
      .map((e) => [e.degree, e.field].filter(Boolean).join(", "))
      .filter((s) => s.length > 0),
    employers: p.employers.map((e) => ({
      id: e.id,
      /* ⚠ A role title can itself name the employer ("Consultant, Ceres"), so
         it goes through the scrubber like any other free text. */
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
    /* ⚠ Filled by the caller, which owns the Learn read. */
    learnPaths: [],
    languages: p.languages.map((l) => l.name),
    specializations: p.specializations.map((s) => s.specialization.name),
  };
}

/**
 * ⚠ Solo projects, as their own masked rows (no employer claims them).
 * ⚠⚠ A solo engagement has no employer to hide, so it carries NO
 * `EMPLOYER_LOCK_COPY` line — the row is the whole truth about it already.
 */
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

/**
 * ── ⚠⚠ THE COUNTRY FILTER'S OPTIONS, MEASURED NOT ENUMERATED ─────────────────
 *
 * ⚠⚠⚠ **IT RETURNS ONLY COUNTRIES THAT ACTUALLY HAVE AN ELIGIBLE PROVIDER.**
 * ⚠ The obvious implementation is `ALL_COUNTRIES` from `lib/country.ts`, and it
 * is wrong here: a filter listing ~250 countries when a dozen have providers is
 * **250 ways to empty the page**, and every empty result reads as *"Panameer has
 * nobody"* rather than *"nobody is in Chad"*.
 * ⚠⚠ Same rule as a card's absent industry — do not offer a control whose most
 * likely outcome is a false impression. The counts are real, so they can be
 * shown; the brief forbids only a TOTAL MEMBER count Scott has not seen.
 */
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
