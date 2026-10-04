import { ADMIN_PAGES } from "@/lib/admin-pages";
import type { Tile } from "@/components/console/ConsolePage";

/** URL-safe id for a metric label. "Work Requests" → "work-requests". */
export function reportSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type Report = { label: string; href: string; metric: string; scope: string };

const EXTRA_VOLUME: Record<string, string[]> = {
  "/admin": [
    "Work Requests",
    "Work Orders",
    "Contracts",
    "Settlement Requests",
    "Payments",
  ],
  "/admin/learn": [
    "Learning Paths",
    "Courses",
    "Lessons",
    "Tests",
    "Certifications",
  ],
};

/** Route → the metric labels that route reports on. */
function metricsFor(pathname: string): string[] {
  if (EXTRA_VOLUME[pathname]) return EXTRA_VOLUME[pathname];
  const slug = pathname.replace(/^\/admin\//, "").split("/")[0];
  const spec = ADMIN_PAGES[slug];
  if (!spec?.volume) return [];
  return spec.volume.filter((t) => !t.tbd).map((t) => t.label);
}

/** Human name for the page a report belongs to (shown on the report shell). */
export function scopeName(pathname: string): string {
  if (pathname === "/admin") return "Panameer Dashboard";
  const slug = pathname.replace(/^\/admin\//, "").split("/")[0];
  return ADMIN_PAGES[slug]?.listingTitle ?? slug.replace(/-/g, " ");
}

export function reportsFor(pathname: string): Report[] {
  // On a report page, keep offering its siblings rather than an empty panel.
  const base = pathname.startsWith("/admin/reports")
    ? (REPORT_INDEX[pathname.split("/")[3] ?? ""]?.from ?? "/admin")
    : pathname;
  return metricsFor(base).map((label) => ({
    label: `${label} Over Time`,
    href: `/admin/reports/${reportSlug(label)}`,
    metric: label,
    scope: scopeName(base),
  }));
}

/**
 * Every report the console can reach, by slug — so a report URL can name its
 * own metric without the page it came from being in the request.
 */
export const REPORT_INDEX: Record<string, { metric: string; from: string }> =
  (() => {
    const out: Record<string, { metric: string; from: string }> = {};
    const routes = [
      ...Object.keys(EXTRA_VOLUME),
      ...Object.keys(ADMIN_PAGES).map((s) => `/admin/${s}`),
    ];
    for (const route of routes) {
      for (const metric of metricsFor(route)) {
        // First route to claim a metric owns it. "Work Requests" appears on
        // several strips; the report is the same report either way.
        out[reportSlug(metric)] ??= { metric, from: route };
      }
    }
    return out;
  })();

/** Adds report links to a volume strip's defined tiles. */
export function linkVolume(tiles: Tile[]): Tile[] {
  return tiles.map((t) =>
    t.tbd || !REPORT_INDEX[reportSlug(t.label)]
      ? t
      : { ...t, href: `/admin/reports/${reportSlug(t.label)}` }
  );
}
