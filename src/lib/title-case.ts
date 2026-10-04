
const ARTICLES = new Set(["a", "an", "the"]);
const COORD = new Set(["and", "but", "or", "nor", "for", "yet", "so"]);
const SHORT_PREP = new Set([
  "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto", "out",
  "over", "to", "up", "with",
]);
const LOWER = new Set([...ARTICLES, ...COORD, ...SHORT_PREP]);

const PARTICLE_RISK = new Set(["up", "out", "off", "over", "on", "in", "yet"]);

/** Abbreviations that are never capitalised by this rule. */
const ABBREV = new Set(["vs", "etc", "eg", "ie"]);

const ORDINAL = /^\d+(st|nd|rd|th)$/i;

function capWord(w: string): string {
  if (!w) return w;
  if (/[A-Z]/.test(w.slice(1))) return w;
  if (ORDINAL.test(w)) return w.toLowerCase();
  return w[0].toUpperCase() + w.slice(1);
}

export function titleCase(input: string): string {
  if (/&[a-z]+;/i.test(input)) return input;

  const parts = input.split(" ");
  const wordIdx = parts
    .map((p, i) => (/[A-Za-z]/.test(p) ? i : -1))
    .filter((i) => i >= 0);
  if (wordIdx.length === 0) return input;
  const first = wordIdx[0];
  const last = wordIdx[wordIdx.length - 1];

  return parts
    .map((p, i) => {
      if (!/[A-Za-z]/.test(p)) return p;
      if (p.includes("-")) return p.split("-").map(capWord).join("-");

      const lead = p.match(/^[^A-Za-z]*/)![0];
      const trail = p.match(/[^A-Za-z]*$/)![0];
      const core = p.slice(lead.length, p.length - trail.length || undefined);
      const lc = core.toLowerCase();

      if (ABBREV.has(lc)) return p;
      if (i === first || i === last) return lead + capWord(core) + trail;
      /* An existing capital on a particle is deliberate — see PARTICLE_RISK. */
      if (PARTICLE_RISK.has(lc) && /[A-Z]/.test(core[0])) return p;
      if (LOWER.has(lc) && !/[A-Z]/.test(core.slice(1))) return lead + lc + trail;
      return lead + capWord(core) + trail;
    })
    .join(" ");
}
