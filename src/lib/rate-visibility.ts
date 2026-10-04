import { hasCapability, type Viewer } from "@/lib/access";

export function canSeeRate(opts: {
  isOwner: boolean;
  viewer: Viewer | null | undefined;
}): boolean {
  if (opts.isOwner) return true;
  return opts.viewer != null && hasCapability(opts.viewer, "canHireTalent");
}
