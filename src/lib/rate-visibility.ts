import { hasCapability, type Viewer } from "@/lib/access";

export function canSeeRate(opts: {
  isOwner: boolean;
  viewer: Viewer | null | undefined;
}): boolean {
  if (opts.isOwner) return true;
  return viewerCanHire(opts.viewer);
}

/** The one place the hire capability is tested; rates and the Hire button both read it. */
export function viewerCanHire(viewer: Viewer | null | undefined): boolean {
  return viewer != null && hasCapability(viewer, "canHireTalent");
}
