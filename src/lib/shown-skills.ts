/**
 * ── ⚠⚠ WHICH OF A PROVIDER'S SKILLS ARE SHOWN (`P2-J1.4-E517`) ─────────────
 *
 * PURE. No prisma, no React — one rule, read by every offer-side surface.
 *
 * ⚠⚠ SCOTT'S RULING, 2026-09-17, AND IT IS `E481` APPLIED TO A NEW AXIS:
 * *"FILTER WHAT IS OFFERED, NEVER WHAT IS HELD. A role selection is an
 * offer-side statement — 'present me as an Application-Specific consultant'. It
 * is not evidence that the other skills are false, so it must not delete them."*
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the mechanism this replaces, the
 * role step's prune in `onboarding.ts`:
 *
 *     await prisma.providerSkill.deleteMany({
 *       where: {
 *         provider_profile_id: profileId,
 *         skill: { role_type_id: { notIn: roleTypeIds } },
 *       },
 *     });
 *
 * ⚠⚠ THAT DELETED TEN OF SCOTT'S OWN SKILLS FROM A RADIO BUTTON, silently, with
 * no undo. ⚠ The prune was not wrong about what to SHOW; it was wrong to make a
 * save destroy data it did not create — the rule broken three times in one week
 * (`E552`, `E553`, this).
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 *   · a skill is SHOWN when its role is one the provider selected;
 *   · ⚠⚠ NO SELECTION SHOWS EVERYTHING. Scott, 2026-09-17: *"ABSENCE IS NOT A
 *     NEGATIVE STATEMENT. 'No roles selected' means the provider has not said
 *     anything, not that they have said 'nothing.'"* ⚠ Measured: 28 profiles
 *     hold 165 skills with no role recorded — blanking those because of a
 *     question nobody answered is the exact harm this fix exists to prevent.
 *     ⚠ It is the same rule `E549` settled for a missing end date.
 *   · ⚠ NOTHING EXPIRES. A skill someone used in 2019 is still something they
 *     did (Scott, 2026-09-17). There is no age test here and must not be one.
 *
 * ⚠ HOLD-SIDE READS DO NOT USE THIS. The rollup, `deriveRolesFromSkills` and the
 * skills step read what is HELD — that is the whole point of keeping the rows.
 */
export function isSkillShown(
  selectedRoleTypeIds: readonly string[] | ReadonlySet<string>,
  skillRoleTypeId: string | null | undefined
): boolean {
  const selected =
    selectedRoleTypeIds instanceof Set
      ? selectedRoleTypeIds
      : new Set(selectedRoleTypeIds as readonly string[]);
  /* ⚠ ABSENCE IS NOT A NEGATIVE STATEMENT — see above. */
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

/**
 * The provider's selected roles, from the multi-select rows with the primary as
 * a fallback. ⚠ `ProviderProfileRole` is the multi-select (`E509`); older
 * profiles may carry only `role_type_id`.
 */
export function selectedRoleIds(p: {
  role_type_id?: string | null;
  roles?: readonly { role_type_id: string }[] | null;
}): string[] {
  const ids = (p.roles ?? []).map((r) => r.role_type_id);
  if (ids.length > 0) return ids;
  return p.role_type_id ? [p.role_type_id] : [];
}
