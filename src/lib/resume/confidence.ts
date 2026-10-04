import type { ParsedResume } from "./parse";

export type ParseConfidence = {
  score: "high" | "low";
  reasons: string[];
  /** The raw measurements, for the escalation log (WS4) and for tuning. */
  signals: {
    datedEntries: number;
    totalEntries: number;
    dateRangesInText: number;
    unplacedRatio: number;
    skillsOverflow: boolean;
  };
};

/** Date ranges as they appear in real résumés — the same shapes parse.ts hunts. */
const DATE_RANGE =
  /\b(?:(?:19|20)\d{2}|(?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|[A-Z][a-z]{2,8}\s+(?:19|20)\d{2})\s*(?:-|–|—|to|through|until)\s*(?:present|current|now|(?:19|20)\d{2}|(?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|[A-Z][a-z]{2,8}\s+(?:19|20)\d{2})/gi;

function unplacedRatio(text: string, parsed: ParsedResume): number {
  const placed =
    (parsed.headline?.length ?? 0) +
    (parsed.overview?.length ?? 0) +
    parsed.experiences.reduce(
      (n, e) =>
        n +
        (e.employer?.length ?? 0) +
        (e.roleTitle?.length ?? 0) +
        (e.description?.length ?? 0),
      0
    ) +
    parsed.education.reduce(
      (n, e) => n + (e.institution?.length ?? 0) + (e.degree?.length ?? 0) + (e.field?.length ?? 0),
      0
    ) +
    parsed.skills.join("").length +
    parsed.languages.join("").length;

  const total = text.replace(/\s+/g, " ").trim().length;
  if (total === 0) return 0;
  return Math.max(0, Math.min(1, 1 - placed / total));
}

export type AssessOptions = {
  source?: "heuristic" | "ai";
};

export function assessParse(
  text: string,
  parsed: ParsedResume,
  options: AssessOptions = {}
): ParseConfidence {
  const reasons: string[] = [];
  const fromAi = options.source === "ai";

  const totalEntries = parsed.experiences.length + parsed.projects.length;
  const datedEntries =
    parsed.experiences.filter((e) => e.startDate).length +
    parsed.projects.filter((p) => p.startDate).length;
  const dateRangesInText = (text.match(DATE_RANGE) ?? []).length;
  const unplaced = unplacedRatio(text, parsed);
  const skillsOverflow = parsed.gaps.some((g) => /too many to be right|didn't look like skills/i.test(g));

  let hardTell = false;

  // --- the tells ----------------------------------------------------------
  if (totalEntries === 0) {
    reasons.push("We couldn't find any work history in this file.");
    hardTell = true;
  } else if (datedEntries === 0) {
    reasons.push("We found employers but couldn't read any dates for them.");
    // Only decisive when the document plainly HAS dates — otherwise a genuinely
    // undated CV would be escalated for telling the truth about itself.
    if (dateRangesInText >= 3) hardTell = true;
  }

  if (dateRangesInText >= 3 && totalEntries === 0) {
    reasons.push(
      `Your document shows ${dateRangesInText} date ranges, but we couldn't match them to jobs or projects.`
    );
    hardTell = true;
  }

  if (!fromAi && unplaced > 0.8 && text.length > 1500) {
    reasons.push("Most of the document didn't fit into any profile field.");
    hardTell = true;
  }

  // SOFT: real, worth showing, never decisive on its own.
  if (skillsOverflow) {
    reasons.push("The skills we found look more like sentences than skills.");
  }

  const aiFoundEntries =
    fromAi && parsed.experiences.some((e) => e.employer?.trim());

  const score: "high" | "low" = aiFoundEntries ? "high" : hardTell ? "low" : "high";

  return {
    score,
    reasons,
    signals: {
      datedEntries,
      totalEntries,
      dateRangesInText,
      unplacedRatio: Number(unplaced.toFixed(3)),
      skillsOverflow,
    },
  };
}
