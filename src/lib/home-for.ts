import type { Viewer } from "@/lib/access";

/**
 * Where a signed-in person's HOME is (WS2 / E003).
 *
 * The Panameer Admin lands on the PLATFORM CONSOLE, not the provider
 * Opportunities dashboard. That was the observed bug: an admin signing in was
 * dropped onto a provider's job-search board, which is neither their job nor
 * their data — and it is what made the admin look like a mis-seeded provider
 * rather than a Panameer employee.
 *
 * One function so login, the header Home icon and the rail brand all agree.
 * Admin is checked FIRST: a Panameer employee may also carry provider flags
 * from the seed (that artifact is what WS7 removes), and their console must win
 * regardless.
 */
export function homeFor(viewer: Pick<Viewer, "isSystemAdmin"> | null): string {
  if (!viewer) return "/login";
  if (viewer.isSystemAdmin) return "/admin";
  return "/dashboard";
}
