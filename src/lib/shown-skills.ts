export function isSkillShown(
  selectedRoleTypeIds: readonly string[] | ReadonlySet<string>,
  skillRoleTypeId: string | null | undefined
): boolean {
  const selected =
    selectedRoleTypeIds instanceof Set
      ? selectedRoleTypeIds
      : new Set(selectedRoleTypeIds as readonly string[]);
  if (selected.size === 0) return true;
  if (!skillRoleTypeId) return true;
  return selected.has(skillRoleTypeId);
}

/** The shown subset, preserving order. */
export function shownSkills<T>(
  selectedRoleTypeIds: readonly string[] | ReadonlySet<string>,
  rows: readonly T[],
  roleOf: (row: T) => string | null | undefined
): T[] {
  return rows.filter((r) => isSkillShown(selectedRoleTypeIds, roleOf(r)));
}

export function selectedRoleIds(p: {
  role_type_id?: string | null;
  roles?: readonly { role_type_id: string }[] | null;
}): string[] {
  const ids = (p.roles ?? []).map((r) => r.role_type_id);
  if (ids.length > 0) return ids;
  return p.role_type_id ? [p.role_type_id] : [];
}
