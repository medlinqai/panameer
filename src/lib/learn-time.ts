// "48 min" / "1.5 h" for Learn (client-safe).
export const timeLabel = (min: number) => (!min ? null : min < 60 ? `${min} min` : `${Math.round((min / 60) * 2) / 2} h`);

/** L-E039: one way to count progress everywhere — done of the lessons with a video, plus how many are coming soon. */
export function lessonCount(lessons: { playable: boolean; done: boolean }[]) {
  const out = lessons.filter((l) => l.playable).length;
  const done = lessons.filter((l) => l.playable && l.done).length;
  const soon = lessons.length - out;
  return { done, out, soon, finished: out > 0 && done >= out, label: `${done} of ${out}${soon ? ` · ${soon} coming soon` : ""}` };
}
