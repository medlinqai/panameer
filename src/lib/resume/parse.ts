/**
 * Résumé → structured profile (brief_P / E012).
 *
 * Deliberately a HEURISTIC parser, not an AI one: it finds the standard résumé
 * section headings, then reads the lines under each. Real-world documents vary
 * wildly, so the contract is "extract what is confidently recognisable, and be
 * honest about the rest" — everything it cannot place becomes a GAP, which the
 * review page surfaces to the user (E019). Silent partial imports are the
 * failure mode to avoid: a user who thinks their history imported and finds it
 * missing at publish time is worse off than one told up front.
 *
 * Pure (no prisma, no I/O) so it is testable in isolation.
 */

export type ParsedExperience = {
  employer: string;
  roleTitle: string;
  description: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
};

export type ParsedEducation = {
  institution: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
};

export type ParsedResume = {
  headline: string | null;
  overview: string | null;
  /** Inferred from the career span (E003); null when undeterminable. */
  experienceLevel: "BEGINNER" | "MID_CAREER" | "EXPERT" | null;
  /** Years of experience behind that inference, for the review copy. */
  experienceYears: number | null;
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  skills: string[];
  languages: string[];
  /** Human-readable notes on what could NOT be imported (E019 surfaces these). */
  gaps: string[];
};

/** Section headings we recognise, mapped to a canonical bucket. */
const SECTION_PATTERNS: { key: Section; re: RegExp }[] = [
  { key: "summary", re: /^(professional\s+)?(summary|profile|about|objective|overview)\b/i },
  /*
    E122 — "Career Experience" was not recognised, so Eddie Cairnie's five
    employers never reached the experience bucket and his résumé imported three
    education entries and zero jobs. The old pattern only allowed work /
    professional / employment / relevant as prefixes; "career" and a bare
    "employment history" both fell through. Headings are the load-bearing part of
    this parser — miss one and the whole section is invisible.
  */
  {
    key: "experience",
    re: /^(work|professional|employment|relevant|career|industry|related)?\s*(experience|history|employment|background)\b/i,
  },
  { key: "education", re: /^education(\s+(and|&)\s+training)?\b/i },
  { key: "skills", re: /^(technical\s+|core\s+|key\s+)?(skills|competenc(y|ies)|expertise|technologies)\b/i },
  { key: "languages", re: /^languages?\b/i },
  { key: "certifications", re: /^(certifications?|licenses?|licences?|accreditations?)\b/i },
  { key: "ignore", re: /^(interests|hobbies|references|publications|awards|volunteer|projects|contact|recommendations|accomplishments)\b/i },
  /**
   * PJv2 WS2 (E055) — SIDEBAR headings from two-column CVs.
   *
   * These were the whole 28-education bug: Scott's CV carries a left rail of
   * "PRIOR ROLE-TYPES / SPECIALIZATIONS / INDUSTRY EXP / APPLICATIONS", none of
   * which were recognised as headings — so whatever bucket was last active kept
   * swallowing them, and a résumé with NO education section ended up with 28
   * education entries. Recognising them is what stops the greedy swallow; they
   * route to `ignore` because they duplicate axes the wizard captures properly
   * (specializations, the RDS catalog).
   */
  { key: "ignore", re: /^(prior\s+)?role[\s-]?types?\b/i },
  { key: "ignore", re: /^specializations?\b/i },
  { key: "ignore", re: /^industr(y|ies)(\s+(exp|experience))?\b/i },
  { key: "ignore", re: /^applications?\b/i },
  { key: "ignore", re: /^(tools?|platforms?|systems?)\b/i },
  { key: "ignore", re: /^(profile\s+)?highlights?\b/i },
];

/**
 * Sane caps (PJv2 WS2). A parser that reports 252 skills or 28 educations has
 * not found 252 skills — it has lost its place. Truncation is always REPORTED
 * in `gaps`, never silent, so "we kept the first N" is visible rather than
 * looking like a complete import.
 */
const CAPS = {
  experiences: 20,
  education: 12,
  skills: 40,
  languages: 12,
} as const;

type Section =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "ignore"
  | "header";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Month names ONLY. A generic `[A-Za-z]{3,9}` prefix looks equivalent but
 * isn't: on "…Information Systems   2007 - 2011" it captures "Systems 2007",
 * which then fails to parse as a date AND gets stripped from the degree text.
 * Matching real month names keeps the surrounding words intact.
 */
const MONTH_RE =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+";

/** "Jan 2019", "January 2019", "2019/01", "2019" → YYYY-MM-DD (day 1). */
function parseMonthYear(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const withMonth = s.match(/^([a-z]{3,9})\.?\s+(\d{4})$/);
  if (withMonth) {
    const m = MONTHS[withMonth[1].slice(0, 3)];
    if (m) return `${withMonth[2]}-${String(m).padStart(2, "0")}-01`;
  }
  const yearOnly = s.match(/^(19|20)\d{2}$/);
  if (yearOnly) return `${s}-01-01`;
  const numeric = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (numeric) return `${numeric[2]}-${String(Number(numeric[1])).padStart(2, "0")}-01`;
  return null;
}

/**
 * Find a "Jan 2019 – Present" style range anywhere in a line.
 *
 * TRUNCATION-SAFETY (brief_P pitfall, hardened in brief_Q). The matched span is
 * DELETED from the line so the remainder can be read as title/employer/degree —
 * which means an over-greedy match silently corrupts neighbouring text. Two
 * guards, both load-bearing:
 *   1. the optional month prefix enumerates real month names, so
 *      "…Information Systems  2007 - 2011" can't capture "Systems 2007";
 *   2. `\b` boundaries stop a year matching inside a longer token (an employee
 *      id like "X2019-2021" is not a date range).
 * `stripRange` then repairs the seam left behind, rather than leaving a
 * double space or a dangling separator that would look like a missing field.
 */
function findDateRange(line: string): { start: string | null; end: string | null; matched: string } | null {
  const re = new RegExp(
    `\\b((?:${MONTH_RE})?(?:19|20)\\d{2})\\s*(?:[–—\\-]{1,2}|to|until|through)\\s*((?:${MONTH_RE})?(?:19|20)\\d{2}|present|current|now|date)\\b`,
    "i"
  );
  const m = line.match(re);
  if (!m) return null;
  const endRaw = m[2].toLowerCase();
  const isCurrent = /present|current|now|date/.test(endRaw);
  const start = parseMonthYear(m[1]);
  const end = isCurrent ? null : parseMonthYear(m[2]);
  // A "range" whose start we can't actually read is not a usable match — better
  // to leave the text intact than to delete it and lose the words.
  if (!start && !isCurrent && !end) return null;
  return { start, end, matched: m[0] };
}

/**
 * Remove a matched date range and tidy the seam: collapse doubled spaces and
 * drop separators/parentheses that only existed to fence the dates off.
 */
function stripRange(line: string, matched: string): string {
  return line
    .replace(matched, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|,;•·–—-]+/, "")
    .replace(/[\s|,;•·–—-]+$/, "")
    .trim();
}

/**
 * Infer the provider's experience level (E003) from the résumé's career span.
 * Years are counted from the EARLIEST start date to the latest end (or today
 * for a current role). Returns null when there aren't enough dates to be
 * confident — a wrong guess is worse than asking.
 */
export function inferExperienceLevel(
  experiences: ParsedExperience[]
): { level: "BEGINNER" | "MID_CAREER" | "EXPERT"; years: number } | null {
  const starts = experiences
    .map((e) => e.startDate)
    .filter((d): d is string => !!d)
    .sort();
  if (starts.length === 0) return null;

  const firstStart = new Date(starts[0]);
  const ends = experiences.map((e) => e.endDate).filter((d): d is string => !!d);
  const hasCurrentRole = experiences.some((e) => e.startDate && !e.endDate);
  const lastEnd = hasCurrentRole
    ? new Date()
    : ends.length > 0
      ? new Date(ends.sort()[ends.length - 1])
      : new Date();

  const years = Math.max(
    0,
    (lastEnd.getTime() - firstStart.getTime()) / (365.25 * 24 * 3600 * 1000)
  );
  if (!Number.isFinite(years)) return null;

  const rounded = Math.round(years * 10) / 10;
  if (years < 3) return { level: "BEGINNER", years: rounded };
  if (years < 10) return { level: "MID_CAREER", years: rounded };
  return { level: "EXPERT", years: rounded };
}

function yearOf(iso: string | null): number | null {
  return iso ? Number(iso.slice(0, 4)) : null;
}

const BULLET = /^[\s]*[•·▪◦\-–—*]\s*/;

function classify(line: string): Section | null {
  const t = line.trim().replace(/[:•]+$/, "").trim();
  if (!t || t.length > 60) return null;
  // A heading is short and usually its own line; require a pattern hit.
  for (const { key, re } of SECTION_PATTERNS) if (re.test(t)) return key;
  return null;
}

/**
 * Parse extracted résumé text into profile data.
 * `text` is the output of `extractText`.
 */
/**
 * Split a two-column line back into two logical lines (PJv2 WS2 / E055).
 *
 * PDF text extraction reads across the page, so a two-column CV emits
 * "SPECIALIZATIONS        Led the Oracle Cloud rollout" as ONE line — the
 * sidebar heading and the body text concatenated, which is why headings stopped
 * being recognised and content landed in the wrong section. A run of 3+ spaces
 * is the reliable signature of that column gutter.
 */
function delinearize(line: string): string[] {
  const parts = line.split(/\s{3,}/).map((x) => x.trim()).filter(Boolean);
  // Only treat it as two columns when BOTH sides carry real content; a single
  // trailing date ("Acme Consulting        2019 – Present") must stay one line
  // or the employer loses its dates.
  if (parts.length < 2) return [line];
  const looksLikeDateTail = /^[\d(]|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(parts[parts.length - 1]);
  if (parts.length === 2 && looksLikeDateTail) return [line];
  return parts;
}

/**
 * TOKEN SANITY (PJv2 WS2, exported in WS-B).
 *
 * Splitting a skills block on commas is right for "Requisitions, Sourcing,
 * Payables" and catastrophic for a prose paragraph that happens to contain
 * commas — that is where "252 skills" came from. A skill is a SHORT NOUN PHRASE,
 * so anything sentence-shaped is rejected.
 *
 * Module-level and exported because WS-B's suggest-and-confirm list has to apply
 * the SAME test: a term the parser would have refused as a skill must not come
 * back as a suggestion the provider is invited to confirm. One rule, one place.
 */
export function isPlausibleSkillTerm(t: string): boolean {
  if (t.length < 2 || t.length > 60) return false;
  if (!/[a-z]/i.test(t)) return false; // pure numbers / punctuation
  // A skill is a few words, not a clause.
  if (t.split(/\s+/).length > 6) return false;
  // Sentence punctuation is a strong tell that this is prose.
  if (/[.!?]$/.test(t) && !/\b[A-Z]\.$/.test(t)) return false;
  // Dates, durations and bare years are not skills.
  if (/^(19|20)\d{2}\b/.test(t)) return false;
  if (/^\d+\s*(years?|yrs?|months?|\+)/i.test(t)) return false;
  // Contact details leaking out of a header block.
  if (/@|https?:\/\/|\+?\d[\d\s().-]{7,}/.test(t)) return false;
  return true;
}

/** Clause fragments start with a connective; real skills don't. */
export const STOPWORD_START =
  /^(and|or|but|with|within|across|for|from|into|onto|to|of|in|on|at|by|as|the|a|an|plus|including|many|several|various|over|about)\b/i;

export function parseResume(text: string): ParsedResume {
  const rawLines = text
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .flatMap(delinearize);
  const lines = rawLines.filter((l) => l.trim() !== "");

  const gaps: string[] = [];
  const buckets: Record<Section, string[]> = {
    header: [], summary: [], experience: [], education: [],
    skills: [], languages: [], certifications: [], ignore: [],
  };

  let current: Section = "header";
  let sawAnySection = false;
  for (const line of lines) {
    const heading = classify(line);
    if (heading) {
      current = heading;
      sawAnySection = true;
      continue;
    }
    buckets[current].push(line);
  }

  if (!sawAnySection) {
    gaps.push(
      "We couldn't find standard résumé headings (Experience, Education, Skills), so little could be imported automatically. Add your details manually below."
    );
  }

  // --- Headline ------------------------------------------------------------
  // The header block is usually: NAME, then the professional title, then
  // contact lines. We want the TITLE, so drop contact lines and prefer the
  // second remaining line — taking the first would set the headline to the
  // person's own name.
  const headerCandidates = buckets.header
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length >= 8 &&
        l.length <= 120 &&
        !/@|https?:\/\/|linkedin\.com|\+?\d[\d\s().-]{7,}/i.test(l)
    );
  const headline =
    headerCandidates.length > 1 ? headerCandidates[1] : headerCandidates[0] ?? null;

  // --- Summary -------------------------------------------------------------
  const overviewRaw = buckets.summary.join(" ").replace(/\s+/g, " ").trim();
  const overview = overviewRaw.length >= 40 ? overviewRaw : null;
  if (!overview && buckets.summary.length > 0) {
    gaps.push("Your summary was too short to import — we left the bio for you to write.");
  }

  // --- Experience ----------------------------------------------------------
  const experiences: ParsedExperience[] = [];
  let pending: ParsedExperience | null = null;
  const flush = () => {
    if (pending && (pending.employer || pending.roleTitle)) {
      // A role with no employer still carries value; label it rather than drop.
      if (!pending.employer) pending.employer = "(Employer not detected)";
      if (!pending.roleTitle) pending.roleTitle = "(Role not detected)";
      experiences.push(pending);
    }
    pending = null;
  };

  /*
    E122 — TWO-LINE BLOCKS. Eddie Cairnie's résumé (and this is a common
    consulting layout) writes each job as

        OraCloud Plus, LLC, Management Consulting, Miami Florida   ← company
        Director 2018-Present                                       ← role + dates
        Analyze, design, deploy and support …                       ← summary
        Key Contributions:                                          ← label
        • …                                                         ← bullets

    The old loop only ever read the employer out of the SAME line as the dates,
    so every one of these roles imported as "(Employer not detected)" — the
    company was one line up, and once a role was pending, the next company line
    was swallowed as description.

    The fix is a one-line LOOKAHEAD: an undated, unbulleted line whose next
    meaningful line carries dates is a company header, not prose. That is what
    distinguishes "Citigroup, Expense Management Group, New York" from a
    sentence about what someone did there.
  */
  const expLines = buckets.experience;
  /** The next line that is not blank — what the lookahead actually reads. */
  const nextMeaningful = (from: number): string | null => {
    for (let j = from; j < expLines.length; j++) {
      if (expLines[j].trim()) return expLines[j];
    }
    return null;
  };

  /**
   * "OraCloud Plus, LLC, Management Consulting, Miami Florida" → the company.
   *
   * These headers are `Company, [suffix,] descriptor, location`, so the first
   * comma segment is the name — plus a corporate suffix when the second segment
   * is one, because "OraCloud Plus, LLC" is the company and "OraCloud Plus" is a
   * truncation of it.
   */
  const companyFromHeader = (line: string): string => {
    const parts = line.split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length === 0) return line.trim();
    const SUFFIX = /^(llc|l\.l\.c\.|inc|inc\.|ltd|ltd\.|llp|plc|gmbh|corp|corporation|co|pty|ag|sa|bv|nv)$/i;
    return parts[1] && SUFFIX.test(parts[1]) ? `${parts[0]}, ${parts[1]}` : parts[0];
  };

  /** "Key Contributions:" and friends label the bullets; they are not content. */
  const isSectionLabel = (t: string) =>
    /^(key\s+)?(contributions?|achievements?|accomplishments?|responsibilities|highlights?|selected\s+\w+)\s*:?$/i.test(
      t
    );

  /** A company header pending its role line. */
  let companyHeader: string | null = null;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const range = findDateRange(line);
    const isBullet = BULLET.test(line);

    if (!isBullet && isSectionLabel(trimmed)) continue;

    /*
      E122 — the trailing prose roll-up. Eddie's last line is "Additional
      experience as an Executive Director at Morgan Stanley, …, Consultant at
      Cairnie Associates, and Vice President at Salomon Brothers, …" — real
      employers, named, with no dates. Left alone it became description text
      hanging off the previous job. Each "<role> at <Company>" pair becomes its
      own undated entry, which the review page then asks the provider to date.
    */
    if (!isBullet && /^additional\s+(experience|roles?|positions?)\b/i.test(trimmed)) {
      flush();
      companyHeader = null;
      const pairs = [...trimmed.matchAll(/\b(?:as\s+)?(?:an?\s+)?([A-Z][\w.\-/&' ]{2,40}?)\s+at\s+([A-Z][\w.\-/&' ]{2,40})/g)];
      for (const m of pairs) {
        experiences.push({
          employer: m[2].trim().replace(/[,.]$/, ""),
          roleTitle: m[1].trim(),
          description: null,
          startDate: null,
          endDate: null,
        });
      }
      continue;
    }

    if (range && !isBullet) {
      // A dated line starts a new role. Text around the dates is title/employer,
      // commonly "Title — Employer" or "Title at Employer".
      flush();
      const rest = stripRange(line, range.matched);
      const parts = rest.split(/\s+(?:at|@|—|–|\||,)\s+/).map((s) => s.trim()).filter(Boolean);
      pending = {
        roleTitle: parts[0] ?? "",
        // The company header one line up, when this line names no employer of
        // its own — the two-line layout this fix exists for.
        employer: parts[1] ?? (companyHeader ? companyFromHeader(companyHeader) : ""),
        description: null,
        startDate: range.start,
        endDate: range.end,
      };
      companyHeader = null;
      continue;
    }

    /*
      An undated, unbulleted line whose NEXT line is dated MAY be a company
      header — but only if that dated line doesn't already name its own
      employer. Without that second condition the rule is too greedy: a résumé
      written as "Role\nEmployer, dates" has an undated role line followed by a
      dated line, and treating the role as a header threw the role away. Caught
      by a fixture (fin-rajesh went 4 roles → 3) rather than by reasoning.
    */
    if (!isBullet && !range && trimmed.length <= 140) {
      const ahead = nextMeaningful(i + 1);
      const aheadRange = ahead && !BULLET.test(ahead) ? findDateRange(ahead) : null;
      if (ahead && aheadRange) {
        const aheadRest = stripRange(ahead, aheadRange.matched);
        const aheadNamesEmployer =
          aheadRest
            .split(/\s+(?:at|@|—|–|\||,)\s+/)
            .map((x) => x.trim())
            .filter(Boolean).length > 1;
        /*
          …and only if the line LOOKS like a company header. These are written
          "Company, descriptor, location" or end in a corporate suffix, so a
          comma (or a suffix) is the tell. Without this the rule swallowed a
          stray role fragment — fin-rajesh's PDF splits "Senior Associate
          Financial Functional / Consultant 2023" across two lines, and the
          first half was becoming the employer of the second. A role title in
          the employer field is more visibly wrong to the provider than an
          undated extra row, which the review page already prompts them to fix.
        */
        const looksLikeCompany =
          trimmed.includes(",") ||
          /\b(llc|inc\.?|ltd\.?|llp|plc|gmbh|corp(oration)?|pty|group|technologies|solutions|consulting|systems|services)\b/i.test(
            trimmed
          );
        if (!aheadNamesEmployer && looksLikeCompany) {
          flush();
          companyHeader = trimmed;
          continue;
        }
      }
    }

    if (!pending) {
      // Undated heading line — treat as the start of a role we can't date.
      const parts = line.split(/\s+(?:at|@|—|–|\|)\s+/).map((s) => s.trim()).filter(Boolean);
      if (!isBullet && parts.length >= 1 && line.trim().length <= 120) {
        pending = {
          roleTitle: parts[0],
          employer: parts[1] ?? "",
          description: null,
          startDate: null,
          endDate: null,
        };
      }
      continue;
    }

    // Otherwise it's detail for the role in hand.
    const detail = line.replace(BULLET, "").trim();
    if (detail) {
      pending.description = pending.description
        ? `${pending.description}\n${detail}`
        : detail;
    }
  }
  flush();

  const undated = experiences.filter((e) => !e.startDate).length;
  if (undated > 0) {
    gaps.push(
      `${undated} role${undated === 1 ? "" : "s"} imported without dates — we couldn't read a start date. Add the dates so clients see your timeline.`
    );
  }
  const unnamed = experiences.filter(
    (e) => e.employer === "(Employer not detected)" || e.roleTitle === "(Role not detected)"
  ).length;
  if (unnamed > 0) {
    gaps.push(
      `${unnamed} role${unnamed === 1 ? "" : "s"} imported with a missing employer or job title — please fill those in.`
    );
  }
  if (buckets.experience.length > 0 && experiences.length === 0) {
    gaps.push(
      "We found an experience section but couldn't split it into individual roles — please add your work history manually."
    );
  }

  // --- Education -----------------------------------------------------------
  const education: ParsedEducation[] = [];
  for (const line of buckets.education) {
    if (BULLET.test(line) && education.length > 0) {
      const last = education[education.length - 1];
      const detail = line.replace(BULLET, "").trim();
      last.description = last.description ? `${last.description}\n${detail}` : detail;
      continue;
    }
    const range = findDateRange(line);
    const yearMatch = line.match(/(19|20)\d{2}/g);
    const cleaned = range ? stripRange(line, range.matched) : line.trim();
    if (!cleaned) continue;

    // "Institution — Degree, Field" / "Degree, Field — Institution"
    const parts = cleaned.split(/\s*(?:[—–|]|,)\s*/).map((s) => s.trim()).filter(Boolean);
    const degreeIdx = parts.findIndex((p) =>
      /\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|ph\.?d|bachelor|master|doctor|associate|diploma|certificate)\b/i.test(p)
    );
    const institution =
      degreeIdx === 0 ? parts[1] ?? parts[0] : parts[0] ?? cleaned;

    education.push({
      institution,
      degree: degreeIdx >= 0 ? parts[degreeIdx] : null,
      field: degreeIdx >= 0 ? parts[degreeIdx + 1] ?? null : parts[1] ?? null,
      startYear: range ? yearOf(range.start) : yearMatch && yearMatch.length > 1 ? Number(yearMatch[0]) : null,
      endYear: range
        ? yearOf(range.end)
        : yearMatch
          ? Number(yearMatch[yearMatch.length - 1])
          : null,
      description: null,
    });
  }

  // --- Skills / languages --------------------------------------------------
  /**
   * TOKEN SANITY (PJv2 WS2). Splitting a skills block on commas is right for
   * "Requisitions, Sourcing, Payables" and catastrophic for a prose paragraph
   * that happens to contain commas — that is where "252 skills" came from. A
   * skill is a SHORT NOUN PHRASE, so anything sentence-shaped is rejected.
   */
  const isPlausibleSkill = isPlausibleSkillTerm;

  const splitList = (ls: string[], sane: (t: string) => boolean) =>
    ls
      .flatMap((l) => l.replace(BULLET, "").split(/[,;|•·]/))
      .map((x) => x.trim())
      .filter((t) => !STOPWORD_START.test(t))
      .filter(sane);

  /**
   * Is this block a LIST or is it PROSE?
   *
   * Both contain commas, so length is no help — a genuine 300-skill list is one
   * very long line, and a paragraph can be short. What separates them is TOKEN
   * SHAPE: split a list and you get many short tokens ("Payables", "Sourcing");
   * split a paragraph and you get few long clause fragments ("programmes across
   * fourteen countries"). If most tokens aren't short, this is prose, and the
   * honest result is ZERO skills plus a note — never a page of junk (E051).
   */
  const isListLike = (tokens: string[]): boolean => {
    if (tokens.length === 0) return false;
    const short = tokens.filter((t) => t.split(/\s+/).length <= 3).length;
    return short / tokens.length >= 0.6;
  };

  const skillTokens = splitList(buckets.skills, isPlausibleSkill);
  let allSkills = [...new Set(skillTokens)];
  if (allSkills.length > 0 && !isListLike(allSkills)) {
    gaps.push(
      "Your skills section reads as prose rather than a list, so we didn't guess at it — add your skills on the Role → Domain → Skills step."
    );
    allSkills = [];
  }
  const allLanguages = [...new Set(
    splitList(buckets.languages, (t) => t.length >= 2 && t.length <= 40 && /[a-z]/i.test(t))
  )];

  // Caps, always REPORTED — a truncated import must never read as a complete one.
  const skills = allSkills.slice(0, CAPS.skills);
  if (allSkills.length > skills.length) {
    gaps.push(
      `We found ${allSkills.length} possible skills — too many to be right, so we kept the first ${skills.length}. Add any we missed on the skills step.`
    );
  }
  const languages = allLanguages.slice(0, CAPS.languages);
  if (allLanguages.length > languages.length) {
    gaps.push(
      `We kept the first ${languages.length} languages of ${allLanguages.length} found.`
    );
  }

  if (buckets.certifications.length > 0) {
    gaps.push(
      "We found certifications on your document. Panameer doesn't import those yet — add them from Settings once you're live."
    );
  }
  if (buckets.ignore.length > 0) {
    gaps.push(
      "Sections we don't import (such as references, awards, or publications) were skipped."
    );
  }

  const inferred = inferExperienceLevel(experiences);
  if (!inferred && experiences.length > 0) {
    gaps.push(
      "We couldn't work out your years of experience from the dates, so pick your experience level yourself."
    );
  }

  const cappedExperiences = experiences.slice(0, CAPS.experiences);
  if (experiences.length > cappedExperiences.length) {
    gaps.push(
      `We found ${experiences.length} roles — more than a résumé usually lists, so we kept the first ${cappedExperiences.length}.`
    );
  }
  const cappedEducation = education.slice(0, CAPS.education);
  if (education.length > cappedEducation.length) {
    gaps.push(
      `We found ${education.length} education entries — that usually means a section ran together, so we kept the first ${cappedEducation.length}. Check them before publishing.`
    );
  }

  return {
    headline,
    overview,
    experienceLevel: inferred?.level ?? null,
    experienceYears: inferred?.years ?? null,
    experiences: cappedExperiences,
    education: cappedEducation,
    skills,
    languages,
    gaps,
  };
}
