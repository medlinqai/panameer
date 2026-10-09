import type { CatPath } from "@/lib/learn-catalog";

// L-E040/L-E045: where a member is on a path, and the one next step — one rule for heroes, cards, Start Here and lessons.
export type PathState = "NEW" | "IN_PROGRESS" | "READY_TO_TEST" | "CERTIFIED" | "COMING_SOON";
export const PICK_NEXT_HREF = "/learn/paths#areas";

export function pathState(p: Pick<CatPath, "certificate" | "test" | "playable" | "mine">): PathState {
  if (p.certificate || p.test.passed) return "CERTIFIED";
  if (!p.playable) return "COMING_SOON";
  if (p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total) return "READY_TO_TEST";
  if (p.mine && (p.mine.enrolled || p.mine.done > 0)) return "IN_PROGRESS";
  return "NEW";
}

export const STATE_LABEL: Record<PathState, string> = { NEW: "", IN_PROGRESS: "In Progress", READY_TO_TEST: "Ready to Test", CERTIFIED: "Certified", COMING_SOON: "Coming Soon" };

/** The main button: Start / Continue / Pick Your Next Path (finished every lesson that's out) / Review (certified). */
export function nextStep(p: Pick<CatPath, "slug" | "title" | "certificate" | "test" | "playable" | "mine">, opts: { long?: boolean } = {}) {
  const s = pathState(p);
  const name = opts.long ? ` ${p.title}` : "";
  if (s === "CERTIFIED") return { state: s, label: "Review", href: `/learn/${p.slug}` };
  if (s === "READY_TO_TEST") return { state: s, label: "Pick Your Next Path", href: PICK_NEXT_HREF };
  if (s === "IN_PROGRESS") return { state: s, label: `Continue${name}`, href: p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}` };
  return { state: s, label: `Start${name}`, href: p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}` };
}
