import type { ParsedResume } from "./parse";

/**
 * How much to trust the heuristic parse — WITHOUT a model (brief_resume_parser_ai
 * WS0 / E128).
 *
 * This is the gate that decides whether to spend on an LLM call. It has to be
 * cheap and it has to be honest, so it looks for the tells that a parse MISSED
 * something rather than for signs it succeeded — a parser that returns nothing
 * looks identical to a résumé with nothing in it unless you check the document.
 *
 * The four tells, each of which caught a real failure:
 *
 *   NO DATED ENTRIES — Eddie and Marelise both returned zero work history. A
 *   professional résumé with no dated role is far more likely to be a miss than
 *   a fact.
 *
 *   DATES WITHOUT ENTRIES — the strongest single signal, and the one that names
 *   the bug. The document is full of "09/2023 to Current" and the parser
 *   produced no employers: it could SEE the dates and could not place them.
 *
 *   UNPLACED CONTENT — what fraction of the document never reached a field.
 *   Marelise's ten project tables extract perfectly and land nowhere, so the
 *   text is long and the output is empty.
 *
 *   SKILLS NOISE — "found 44, kept 40" means the token splitter is scooping
 *   prose, which travels with a lost section rather than a found one.
 *
 * Deliberately NOT a probability. It is a routing decision with reasons
 * attached, and the reasons are shown to the provider (WS3) — so they are
 * phrased as observations about their document, not as diagnostics about us.
 */

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

/**
 * Roughly how much of the document ended up somewhere.
 *
 * Compares the characters the parser placed into fields against the characters
 * it was given. Approximate on purpose — this is a routing signal, not an
 * accounting statement, and an exact answer would need the parser to report
 * provenance per line, which is a bigger change than the gate deserves.
 */
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
  /**
   * Where the parse came from. `"ai"` changes what counts as failure — see
   * below. Defaults to the heuristic, so every existing caller is unaffected.
   */
  source?: "heuristic" | "ai";
};

export function assessParse(
  text: string,
  parsed: ParsedResume,
  options: AssessOptions = {}
): ParseConfidence {
  const reasons: string[] = [];
  const fromAi = options.source === "ai";

  const totalEntries = parsed.experiences.length;
  const datedEntries = parsed.experiences.filter((e) => e.startDate).length;
  const dateRangesInText = (text.match(DATE_RANGE) ?? []).length;
  const unplaced = unplacedRatio(text, parsed);
  const skillsOverflow = parsed.gaps.some((g) => /too many to be right|didn't look like skills/i.test(g));

  /*
    HARD tells flip the score; SOFT ones only add context.

    The split exists because skills-noise alone was flipping Scott's NEW-format
    CV — 8 roles, all dated, parsed perfectly — to "low" purely because the
    skills splitter over-collected. Offering an AI pass on a résumé the free
    parser nailed is exactly the waste the tiering is meant to avoid, and it
    would have taught the provider to ignore the panel.
  */
  let hardTell = false;

  // --- the tells ----------------------------------------------------------
  if (totalEntries === 0) {
    reasons.push("We couldn't find any work history in this file.");
    hardTell = true;
  } else if (datedEntries === 0) {
    // E145 — "employer", never "role".
    reasons.push("We found employers but couldn't read any dates for them.");
    // Only decisive when the document plainly HAS dates — otherwise a genuinely
    // undated CV would be escalated for telling the truth about itself.
    if (dateRangesInText >= 3) hardTell = true;
  }

  /*
    The load-bearing one. Several date ranges present and nothing to attach them
    to means the layout defeated us — which is exactly Eddie (two-line blocks)
    and Marelise (tables). Three is the floor so a single stray year in a summary
    doesn't trip it.
  */
  if (dateRangesInText >= 3 && totalEntries === 0) {
    reasons.push(
      `Your document shows ${dateRangesInText} date ranges, but we couldn't match them to jobs or projects.`
    );
    hardTell = true;
  }

  /*
    UNPLACED CONTENT IS A HEURISTIC TELL ONLY.

    For the rule-based parser, prose that reached no field means it lost its
    place. For the MODEL it means something different and often correct: Marelise
    extracts 11 entries with names and dates, and the remaining text is her
    descriptive bullets, which legitimately have no discrete field to land in.
    Judging the AI result by the same ratio kept the "we had trouble reading
    this" panel up after a pass that had just read the document perfectly — which
    would teach providers the panel is noise.

    So after an AI pass the question is simply: did it extract entries?
  */
  if (!fromAi && unplaced > 0.8 && text.length > 1500) {
    reasons.push("Most of the document didn't fit into any profile field.");
    hardTell = true;
  }

  // SOFT: real, worth showing, never decisive on its own.
  if (skillsOverflow) {
    reasons.push("The skills we found look more like sentences than skills.");
  }

  /*
    THRESHOLD. Low when a HARD tell fired. Still deliberately eager among those:
    the cost of a false "low" is one optional AI offer the provider can decline,
    while the cost of a false "high" is the silent empty section this brief
    exists to end.
  */
  /*
    POST-AI SUCCESS = ENTRIES EXTRACTED. One named entry is more than the
    heuristic managed on the documents that get here, and the provider is about
    to review every row anyway. The PRE-AI gate is untouched — it is what
    correctly routed Marelise to escalate in the first place, and weakening it
    would stop the escalation ever happening.
  */
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
