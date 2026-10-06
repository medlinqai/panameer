
export type ParsedExperience = {
  employer: string | null;
  roleTitle: string;
  description: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  isCurrent?: boolean;
  endUnreadable?: boolean;
};

export type ParsedCertification = {
  name: string;
  issuer: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
};

export type ParsedEducation = {
  institution: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
};

export type ParsedProject = {
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent?: boolean;
  endUnreadable?: boolean;
  client: string | null;
  software: string[];
  employerName: string | null;
  /** Role-Type text read from an engagement table, mapped to a locked role on write. */
  roleText?: string | null;
};

export type ParsedResume = {
  headline: string | null;
  overview: string | null;
  experienceLevel: "BEGINNER" | "MID_CAREER" | "EXPERT" | null;
  /** Years of experience behind that inference, for the review copy. */
  experienceYears: number | null;
  experiences: ParsedExperience[];
  projects: ParsedProject[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  skills: string[];
  languages: string[];
  gaps: string[];
};

/** Section headings we recognise, mapped to a canonical bucket. */
const SECTION_PATTERNS: { key: Section; re: RegExp }[] = [
  { key: "summary", re: /^(professional\s+)?(summary|profile|about|objective|overview)\b/i },
  {
    key: "experience",
    re: /^(work|professional|employment|relevant|career|industry|related)?\s*(experience|history|employment|background)\b/i,
  },
  { key: "education", re: /^education(\s+(and|&)\s+training)?\b/i },
  { key: "skills", re: /^(technical\s+|core\s+|key\s+)?(skills|competenc(y|ies)|expertise|technologies)\b/i },
  { key: "languages", re: /^languages?\b/i },
  { key: "certifications", re: /^(certifications?|licenses?|licences?|accreditations?)\b/i },
  { key: "ignore", re: /^(interests|hobbies|references|publications|awards|volunteer|projects|contact|recommendations|accomplishments)\b/i },
  { key: "ignore", re: /^(prior\s+)?role[\s-]?types?\b/i },
  { key: "ignore", re: /^specializations?\b/i },
  { key: "ignore", re: /^industr(y|ies)(\s+(exp|experience))?\b/i },
  { key: "ignore", re: /^applications?\b/i },
  { key: "ignore", re: /^(tools?|platforms?|systems?)\b/i },
  { key: "ignore", re: /^(profile\s+)?highlights?\b/i },
];

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

const MONTH_RE =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+";

export function parseMonthYear(raw: string): string | null {
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

/** — the words a document uses for an ongoing role. The same */
export function isCurrentWord(raw: string): boolean {
  return /^(present|current|currently|now|to date|date|ongoing|today)\.?$/i.test(raw.trim());
}

/** Find a "Jan 2019 – Present" style range anywhere in a line. */
function findDateRange(
  line: string
): { start: string | null; end: string | null; isCurrent: boolean; matched: string } | null {
  // NUMERIC `MM/YYYY` IS A DATE TOO WS-4)
  const YEAR_TOKEN = `(?:(?:${MONTH_RE})|(?:\\d{1,2}\\/))?(?:19|20)\\d{2}`;
  const re = new RegExp(
    `\\b(${YEAR_TOKEN})\\s*(?:[–—\\-]{1,2}|to|until|through)\\s*(${YEAR_TOKEN}|present|current|now|date)\\b`,
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
  return { start, end, isCurrent, matched: m[0] };
}

/** Remove a matched date range and tidy the seam: collapse doubled spaces and */
function stripRange(line: string, matched: string): string {
  return line
    .replace(matched, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|,;•·–—-]+/, "")
    .replace(/[\s|,;•·–—-]+$/, "")
    .trim();
}

/** Infer the provider's experience level (E003) from the résumé's career span. */
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
  const hasCurrentRole = experiences.some((e) => e.startDate && e.isCurrent === true);
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

/** Parse extracted résumé text into profile data. */
/** Split a two-column line back into two logical lines (PJv2 WS2 / E055). */
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

/** TOKEN SANITY (PJv2 WS2, exported in WS-B). */
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

/** TELLING A COMPANY FROM A ROLE WS-3) */
function looksLikeCompanyName(s: string): boolean {
  return (
    /\b(llc|inc\.?|ltd\.?|llp|plc|gmbh|corp(oration)?|pty|group|technologies|solutions|consulting|systems|services|partners|associates|holdings|labs|studios|university|school|hospital)\b/i.test(
      s
    ) || /\.(ai|io|com|co|net|org)\b/i.test(s)
  );
}

/** ROLE NOUNS, NOT VERBS. A title is named by what the person IS — the words */
function looksLikeRoleTitle(s: string): boolean {
  return /\b(founder|co-?founder|owner|principal|partner|consultant|manager|director|engineer|developer|designer|builder|architect|analyst|specialist|administrator|lead|head|chief|officer|president|vp|vice\s+president|associate|advisor|adviser|strategist|scientist|coordinator|supervisor|intern|contractor|freelancer|writer|creator|instructor|trainer|executive)\b/i.test(
    s
  );
}

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

  // Headline ------------------------------------------------------------
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
      // THE VALUE IS SHOWN TO A PERSON after an import, which is why this one
      // THE SENTINEL WAS STORED, NOT JUST SHOWN WS-4)
      if (!pending.roleTitle) pending.roleTitle = "(Role not detected)";
      experiences.push(pending);
    }
    pending = null;
  };

  // E122 — TWO-LINE BLOCKS. Eddie Cairnie's résumé (and this is a common
  const expLines = buckets.experience;
  /** The next line that is not blank — what the lookahead actually reads. */
  const nextMeaningful = (from: number): string | null => {
    for (let j = from; j < expLines.length; j++) {
      if (expLines[j].trim()) return expLines[j];
    }
    return null;
  };

  /** These headers are `Company, [suffix,] descriptor, location`, so the first */
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

    // E122 — the trailing prose roll-up. Eddie's last line is "Additional
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
      // WHICH SIDE IS THE COMPANY? ASK, DO NOT ASSUME ( WS-3)
      const left = parts[0] ?? "";
      const right = parts[1] ?? "";
      const swap = right !== "" && looksLikeCompanyName(left) && looksLikeRoleTitle(right)
        && !looksLikeRoleTitle(left);
      pending = {
        roleTitle: (swap ? right : left) ?? "",
        // The company header one line up, when this line names no employer of
        // its own — the two-line layout this fix exists for.
        employer:
          (swap ? left : parts[1]) ??
          (companyHeader ? companyFromHeader(companyHeader) : ""),
        description: null,
        startDate: range.start,
        endDate: range.end,
        isCurrent: range.isCurrent,
      };
      companyHeader = null;
      continue;
    }

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
      `${undated} ${undated === 1 ? "company" : "companies"} imported without dates — we couldn't read a start date. Add the dates so clients see your timeline.`
    );
  }
  const unnamed = experiences.filter(
    (e) => !e.employer?.trim() || e.roleTitle === "(Role not detected)"
  ).length;
  if (unnamed > 0) {
    gaps.push(
      `${unnamed} ${unnamed === 1 ? "company" : "companies"} imported with a missing company or job title — please fill those in.`
    );
  }
  if (buckets.experience.length > 0 && experiences.length === 0) {
    gaps.push(
      "We found an experience section but couldn't split it into individual companies — please add your work history manually."
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
  /** TOKEN SANITY (PJv2 WS2). Splitting a skills block on commas is right for */
  const isPlausibleSkill = isPlausibleSkillTerm;

  const splitList = (ls: string[], sane: (t: string) => boolean) =>
    ls
      .flatMap((l) => l.replace(BULLET, "").split(/[,;|•·]/))
      .map((x) => x.trim())
      .filter((t) => !STOPWORD_START.test(t))
      .filter(sane);

  /** Is this block a LIST or is it PROSE? */
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

  // E185 — the gap this used to emit is GONE, not reworded.
  const inferred = inferExperienceLevel(experiences);

  const cappedExperiences = experiences.slice(0, CAPS.experiences);
  if (experiences.length > cappedExperiences.length) {
    // E145 — "employer", never "role". One word for one thing, everywhere.
    gaps.push(
      `We found ${experiences.length} employers — more than a résumé usually lists, so we kept the first ${cappedExperiences.length}.`
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
    // THE HEURISTIC PATH DOES NOT READ CERTIFICATIONS, and says so rather than
    certifications: [],
    experienceLevel: inferred?.level ?? null,
    experienceYears: inferred?.years ?? null,
    /* `E294` — the REGEX parser does not read a projects section: `projects` is
       an IGNORE header in `SECTION_PATTERNS` above. Only the AI path returns
       them. Empty, never absent. */
    projects: [],
    experiences: cappedExperiences,
    education: cappedEducation,
    skills,
    languages,
    gaps,
  };
}
