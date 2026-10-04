import { lineCounts, type ProfileScore, type ScoreLine } from "@/lib/completeness";
import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";

export function openScoreLines(score: Pick<ProfileScore, "lines"> | null | undefined): ScoreLine[] {
  return (score?.lines ?? [])
    .filter((l) => !lineCounts(l.state))
    .sort((a, b) => b.points - a.points);
}

export function openScoreMinutes(lines: ScoreLine[]): number {
  return lines.reduce((sum, l) => sum + (SCORE_LINE_COPY[l.key]?.minutes ?? 0), 0);
}

export function openLinesMissingCopy(lines: ScoreLine[]): ScoreLine[] {
  return lines.filter((l) => !SCORE_LINE_COPY[l.key]);
}
