
/** The least a chip needs: an id, a name, and the domain that separates it. */
export type LabelledSkill = {
  name: string;
  /** The DOMAIN (pillar) name. `getSkillsForRoleTypes` already carries it. */
  area?: string | null;
};

export function ambiguousSkillNames(options: readonly LabelledSkill[]): Set<string> {
  const seen = new Map<string, number>();
  for (const o of options) {
    const k = o.name.trim().toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const out = new Set<string>();
  for (const [k, n] of seen) if (n > 1) out.add(k);
  return out;
}

export function skillQualifier(
  skill: LabelledSkill,
  ambiguous: Set<string>
): string | null {
  if (!ambiguous.has(skill.name.trim().toLowerCase())) return null;
  const area = skill.area?.trim();
  return area ? area : null;
}
