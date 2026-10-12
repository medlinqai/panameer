import type { WorksiteType } from "@prisma/client";

// OF-E003: people still type "remote" — search treats remote and offsite as the same word.
const PAIRS: [RegExp, string][] = [[/\bremote\b/gi, "offsite"], [/\boff-?site\b/gi, "remote"]];
export const OFFSITE_WORKSITE: WorksiteType = "OFFSITE";

/** The query plus its remote/offsite twin (when it has one). */
export function searchVariants(q: string): string[] {
  const out = new Set([q]);
  for (const [re, to] of PAIRS) if (re.test(q)) out.add(q.replace(re, to));
  return [...out];
}

/** True when the whole query is just the offsite/remote word, so it should match the work location too. */
export const meansOffsite = (q: string) => /^\s*(remote|off-?site)\s*$/i.test(q);
