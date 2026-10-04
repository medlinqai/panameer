import { redirect } from "next/navigation";

/**
 * `/community/score` → `/score`, permanently (`P2-A2-E816`).
 *
 * The score is the profile's, and a path two levels inside Connect said
 * otherwise. Kept as a route rather than deleted: the old URL is in briefs,
 * bookmarks and at least one tab row, and a 404 would lose them.
 */
export default function ScoreRedirect() {
  redirect("/score");
}
