// Scott 2026-10-04: two roles carry their job title wherever members see roles.
const TITLES: [prefix: string, title: string][] = [
  ["Application-Specific", "Functional Consultant"],
  ["Technology-Specific", "Technical Consultant"],
];

/** The job title for a role name or display string, if it has one. */
export function roleTitle(label: string | null | undefined): string | null {
  if (!label) return null;
  return TITLES.find(([p]) => label.startsWith(p))?.[1] ?? null;
}

/** "Application-Specific Roles" → "Application-Specific Roles (Functional Consultant)"; others unchanged. */
export function roleLong<T extends string | null | undefined>(label: T): T {
  const t = roleTitle(label);
  if (!t || !label || label.includes(`(${t})`)) return label;
  return `${label} (${t})` as T;
}
