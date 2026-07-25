/**
 * Résumé / LinkedIn-PDF → structured profile (brief_P / E012).
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
  { key: "experience", re: /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|employment)\b/i },
  { key: "education", re: /^education(\s+(and|&)\s+training)?\b/i },
  { key: "skills", re: /^(technical\s+|core\s+|key\s+)?(skills|competenc(y|ies)|expertise|technologies)\b/i },
  { key: "languages", re: /^languages?\b/i },
  { key: "certifications", re: /^(certifications?|licenses?|licences?|accreditations?)\b/i },
  { key: "ignore", re: /^(interests|hobbies|references|publications|awards|volunteer|projects|contact|recommendations|accomplishments)\b/i },
];

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

/** Find a "Jan 2019 – Present" style range anywhere in a line. */
function findDateRange(line: string): { start: string | null; end: string | null; matched: string } | null {
  const re = new RegExp(
    `((?:${MONTH_RE})?(?:19|20)\\d{2})\\s*(?:[–—\\-]|to)\\s*((?:${MONTH_RE})?(?:19|20)\\d{2}|present|current|now)`,
    "i"
  );
  const m = line.match(re);
  if (!m) return null;
  const endRaw = m[2].toLowerCase();
  const isCurrent = /present|current|now/.test(endRaw);
  return {
    start: parseMonthYear(m[1]),
    end: isCurrent ? null : parseMonthYear(m[2]),
    matched: m[0],
  };
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
export function parseResume(text: string): ParsedResume {
  const rawLines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
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

  for (const line of buckets.experience) {
    const range = findDateRange(line);
    const isBullet = BULLET.test(line);

    if (range && !isBullet) {
      // A dated line starts a new role. Text around the dates is title/employer,
      // commonly "Title — Employer" or "Title at Employer".
      flush();
      const rest = line.replace(range.matched, "").replace(/[|,–—-]\s*$/, "").trim();
      const parts = rest.split(/\s+(?:at|@|—|–|\||,)\s+/).map((s) => s.trim()).filter(Boolean);
      pending = {
        roleTitle: parts[0] ?? "",
        employer: parts[1] ?? "",
        description: null,
        startDate: range.start,
        endDate: range.end,
      };
      continue;
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
    const cleaned = line
      .replace(range?.matched ?? "", "")
      .replace(/[|,–—-]\s*$/, "")
      .trim();
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
  const splitList = (ls: string[]) =>
    ls
      .flatMap((l) => l.replace(BULLET, "").split(/[,;|•·]/))
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 60);

  const skills = [...new Set(splitList(buckets.skills))];
  const languages = [...new Set(splitList(buckets.languages))];

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

  return { headline, overview, experiences, education, skills, languages, gaps };
}
