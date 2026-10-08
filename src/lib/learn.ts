

export const OTHER_GROUP = "Other";

export const PLAYABLE_STATUSES = [
  "URL_ADDED_TO_LESSON",
  "BLOG_CREATED",
  "BLOG_RELEASED",
] as const;

export function isPlayable(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): boolean {
  return (
    Boolean(lesson.vimeo_ref?.trim()) &&
    (PLAYABLE_STATUSES as readonly string[]).includes(lesson.production_status)
  );
}

export function urlMissing(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): boolean {
  return (
    (PLAYABLE_STATUSES as readonly string[]).includes(lesson.production_status) &&
    !lesson.vimeo_ref?.trim()
  );
}

export const RECORDED_STATUSES = [
  "RAW_SHOT",
  "PRODUCED",
  "LOADED_TO_STREAMING",
] as const;

export type LessonState = "ready" | "recorded" | "unpublished" | "planned";

export function lessonState(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): LessonState {
  if (isPlayable(lesson)) return "ready";
  if ((RECORDED_STATUSES as readonly string[]).includes(lesson.production_status))
    return "recorded";
  if (urlMissing(lesson)) return "unpublished";
  return "planned";
}

export const LESSON_STATE_LABEL: Record<LessonState, string> = {
  ready: "Ready",
  recorded: "Recorded — not published yet",
  unpublished: "Not published yet",
  planned: "Planned",
};

export const LESSON_STATE_SHORT: Record<LessonState, string> = {
  ready: "Ready",
  recorded: "Recorded",
  unpublished: "Not published",
  planned: "Planned",
};

export function hasPlayableLessons(
  lessons: { vimeo_ref: string | null; production_status: string }[]
): boolean {
  return lessons.some(isPlayable);
}

export type PlayableProgress = {
  /** Lessons a learner can watch. The denominator. */
  playable: number;
  /** How many of THOSE they have watched. */
  completed: number;
  /** 0-100. Always 0 for a path with nothing playable, never NaN. */
  percent: number;
  /** Still to watch. Never negative. */
  remaining: number;
};

export function playableProgress(
  lessons: { id: string; vimeo_ref: string | null; production_status: string }[],
  done: Set<string> | ReadonlySet<string>
): PlayableProgress {
  const watchable = lessons.filter(isPlayable);
  const completed = watchable.filter((l) => done.has(l.id)).length;
  const playable = watchable.length;
  return {
    playable,
    completed,
    percent: playable > 0 ? Math.round((completed / playable) * 100) : 0,
    remaining: Math.max(0, playable - completed),
  };
}

export function playableProgressOfRows(
  rows: { playable: boolean; completed: boolean }[]
): PlayableProgress {
  const watchable = rows.filter((r) => r.playable);
  const completed = watchable.filter((r) => r.completed).length;
  const playable = watchable.length;
  return {
    playable,
    completed,
    percent: playable > 0 ? Math.round((completed / playable) * 100) : 0,
    remaining: Math.max(0, playable - completed),
  };
}

export function pathIsOpenTo(hasPlayableLessons: boolean, isEnrolled: boolean): boolean {
  return hasPlayableLessons || isEnrolled;
}

export function pathHasPlayableLessons(path: {
  courses: { sections: { lessons: { vimeo_ref: string | null; production_status: string }[] }[] }[];
}): boolean {
  return hasPlayableLessons(
    path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons))
  );
}

export function vimeoEmbedUrl(ref: string | null | undefined): string | null {
  const raw = ref?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `https://player.vimeo.com/video/${raw}`;
  // "id/hash" (unlisted videos, as stored by the upload scripts) — was returning null, so lessons showed "no video".
  const ih = /^(\d+)\/([0-9a-z]+)$/i.exec(raw);
  if (ih) return `https://player.vimeo.com/video/${ih[1]}?h=${ih[2]}`;
  if (/player\.vimeo\.com\/video\/\d+/.test(raw)) {
    return raw.startsWith("http") ? raw : `https://${raw}`;
  }
  // vimeo.com/123456789 and vimeo.com/123456789/abcdef (unlisted hash)
  const m = /vimeo\.com\/(?:channels\/[^/]+\/)?(\d+)(?:\/([0-9a-z]+))?/i.exec(raw);
  if (m) {
    return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  }
  // Any other Vimeo link shape (vimeo.com/manage/videos/123…, ?h=hash): take the id, keep the hash.
  const id = /(\d{6,})/.exec(raw)?.[1];
  if (id && (/vimeo/i.test(raw) || /^\d{6,}/.test(raw))) {
    const h = /[?&]h=([0-9a-z]+)/i.exec(raw)?.[1] ?? new RegExp(`${id}/([0-9a-z]{6,})`, "i").exec(raw)?.[1];
    return `https://player.vimeo.com/video/${id}${h ? `?h=${h}` : ""}`;
  }
  return null;
}

export const AUDIENCE_LABEL: Record<string, string> = {
  BEGINNERS: "Beginners",
  END_USER: "End Users",
  IMPLEMENTER: "Implementers",
  CONTENT_CREATOR: "Content Creators",
};

export const AUDIENCE_PREFIX = "For";

export const AUDIENCE_ORDER = [
  "BEGINNERS",
  "END_USER",
  "IMPLEMENTER",
  "CONTENT_CREATOR",
] as const;

export const STYLE_LABEL: Record<string, string> = {
  FA_OVERVIEW: "Functional Area Overview",
  HOW_TO_USE: "How to Use",
  HOW_TO_DEPLOY: "How to Deploy",
  DAILY_JOURNAL: "Daily Journal",
  ASK_THE_EXPERT: "Ask the Expert",
};

export type BrowsePath = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  lessons: number;
  playable: number;
  expert: string | null;
};

/** Every published path, with its counts, grouped for the browse page. */

