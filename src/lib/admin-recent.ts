import { ADMIN_HOME, ADMIN_SETUP, ADMIN_NAV } from "@/lib/nav";

/**
 * Recently-visited admin pages (WS3, the task panel's middle tab).
 *
 * localStorage, not the database: this is a per-browser convenience, it carries
 * nothing anyone else needs, and a table for it would be a write on every page
 * view for no gain. Medlinq's console does the same.
 *
 * Labels come from nav.ts rather than from the URL — the rail already names
 * every one of these pages, and re-deriving "Roles>Domains>Skills" from
 * "/admin/skill-catalog" is impossible anyway.
 */

const KEY = "panameer.admin.recent";
const MAX = 8;

export type Recent = { label: string; href: string };

const LABELS: Record<string, string> = Object.fromEntries(
  [ADMIN_HOME, ADMIN_SETUP, ...ADMIN_NAV.flatMap((g) => g.items)].map((i) => [
    i.href,
    i.label,
  ])
);

function labelFor(pathname: string): string | null {
  if (LABELS[pathname]) return LABELS[pathname];
  // Sub-pages inherit their section's name with the leaf appended, so
  // /admin/setup/learn-authoring reads as "Setup & Maintenance › Learn
  // Authoring" rather than disappearing from the list.
  const parts = pathname.split("/").filter(Boolean);
  for (let i = parts.length - 1; i > 1; i--) {
    const parent = "/" + parts.slice(0, i).join("/");
    if (LABELS[parent]) {
      const leaf = parts
        .slice(i)
        .join(" ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${LABELS[parent]} › ${leaf}`;
    }
  }
  return null;
}

export function recordRecent(pathname: string): void {
  const label = labelFor(pathname);
  if (!label) return;
  try {
    const prev = read().filter((r) => r.href !== pathname);
    localStorage.setItem(
      KEY,
      JSON.stringify([{ label, href: pathname }, ...prev].slice(0, MAX))
    );
  } catch {
    // Private mode / quota. Recency is a nicety; never break the page for it.
  }
}

function read(): Recent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? (parsed.filter(
          (r) => r && typeof r.href === "string" && typeof r.label === "string"
        ) as Recent[])
      : [];
  } catch {
    return [];
  }
}

/** Recent pages OTHER than the one you're on — listing it would be noise. */
export function readRecentForDisplay(pathname: string): Recent[] {
  return read().filter((r) => r.href !== pathname);
}
