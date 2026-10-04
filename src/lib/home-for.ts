import type { Viewer } from "@/lib/access";

export function homeFor(viewer: Pick<Viewer, "isSystemAdmin"> | null): string {
  if (!viewer) return "/login";
  if (viewer.isSystemAdmin) return "/admin";
  return "/dashboard";
}
