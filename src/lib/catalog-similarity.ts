// Name similarity for catalog review: bigram Dice on normalized names, boosted when one contains the other.
const norm = (t: string) => t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(["and", "mgt", "management", "the", "of", "oracle", "cloud"]);

function bigrams(t: string) {
  const s = t.replace(/ /g, "");
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) out.set(s.slice(i, i + 2), (out.get(s.slice(i, i + 2)) ?? 0) + 1);
  return out;
}

export function similarity(a: string, b: string): number {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = bigrams(x), B = bigrams(y);
  let common = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [k, v] of A) common += Math.min(v, B.get(k) ?? 0);
  let score = na + nb ? (2 * common) / (na + nb) : 0;
  const core = (t: string) => t.split(" ").filter((w) => !STOP.has(w)).join(" ");
  const cx = core(x), cy = core(y);
  if (cx && cy && (` ${cx} `.includes(` ${cy} `) || ` ${cy} `.includes(` ${cx} `))) score = Math.max(score, 0.8);
  return score;
}

/** Best score of a name against a target's name and aliases. */
export function bestScore(name: string, target: { name: string; aliasList?: string[] }) {
  return Math.max(similarity(name, target.name), ...(target.aliasList ?? []).map((a) => similarity(name, a)));
}

/** Groups look-alike names (score ≥ 0.6); returns a group key per index. */
export function groupLookAlikes(names: string[]): number[] {
  const parent = names.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) if (similarity(names[i], names[j]) >= 0.6) parent[find(j)] = find(i);
  return names.map((_, i) => find(i));
}
