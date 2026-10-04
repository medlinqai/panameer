import { type ProfileScore } from "@/lib/completeness";
import { openScoreLines, openScoreMinutes } from "@/lib/score-open";

export function completionHook(score: ProfileScore): string {
  const open = openScoreLines(score);
  if (open.length === 0) {
    return "Every line answered. Nothing left to do here.";
  }
  const minutes = openScoreMinutes(open);
  return `${open.length} line${open.length === 1 ? "" : "s"} left. About ${minutes} minute${
    minutes === 1 ? "" : "s"
  } to 100%.`;
}
