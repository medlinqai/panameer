import Link from "next/link";
import { instructorLabel, initialsOf, type Instructor } from "@/lib/learn-instructor-format";

/** One face — a photo, or their initials when they haven't uploaded one. */
export function InstructorAvatar({
  instructor,
  className = "h-11 w-11",
}: {
  instructor: Instructor;
  className?: string;
}) {
  if (instructor.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={instructor.photoUrl}
        alt={instructor.name}
        title={instructor.name}
        className={`${className} shrink-0 rounded-full border border-line bg-bg-soft object-cover object-top`}
      />
    );
  }
  return (
    <span
      title={instructor.name}
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-soft text-[12px] font-bold text-ink-2`}
    >
      {initialsOf(instructor.name)}
    </span>
  );
}

/**
 * "Instructors: A, B and 2 others" — the path and course header (WS6, corrected).
 *
 * A path can genuinely be taught by several people: Advanced Procurement is 85
 * lessons by one person and 18 by another. So this renders a LIST, ordered by
 * how much of the material each one actually teaches, and only says "Instructor"
 * singular when there is genuinely one.
 *
 * Each name is a LINK only when that person has a marketplace-visible profile —
 * which is the whole differentiator, since the person teaching you is someone
 * you can look up and hire. A link to a profile the marketplace would refuse to
 * render is worse than plain text, so the visibility check happens in the query
 * and this component only honours it.
 */
export function InstructorBadge({
  instructors,
  size = "md",
  showLessonCounts = false,
}: {
  instructors: Instructor[];
  size?: "sm" | "md";
  /** On a path with several teachers, who taught how much is the useful part. */
  showLessonCounts?: boolean;
}) {
  if (instructors.length === 0) return null;

  const dim = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const text = size === "sm" ? "text-[14px]" : "text-[16.5px]";
  const many = instructors.length > 1;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      {/* Stacked faces, overlapping — one glance says "more than one person". */}
      <span className="flex shrink-0 items-center">
        {instructors.slice(0, 4).map((ins, i) => (
          <span key={ins.id} className={i > 0 ? "-ml-3" : ""}>
            <InstructorAvatar instructor={ins} className={`${dim} ring-2 ring-white`} />
          </span>
        ))}
        {instructors.length > 4 && (
          <span
            className={`${dim} -ml-3 flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-soft text-[11.5px] font-bold text-ink-2 ring-2 ring-white`}
          >
            +{instructors.length - 4}
          </span>
        )}
      </span>

      <span className={`min-w-0 ${text}`}>
        <span className="text-ink-2">{many ? "Instructors: " : "Instructor: "}</span>
        {instructors.map((ins, i) => (
          <span key={ins.id}>
            {i > 0 && <span className="text-ink-2">{i === instructors.length - 1 ? " and " : ", "}</span>}
            {ins.profileSlug ? (
              <Link
                href={`/providers/${ins.profileSlug}`}
                className="font-bold break-words text-magenta underline underline-offset-4 hover:text-magenta-dark"
              >
                {ins.name}
              </Link>
            ) : (
              <span className="font-bold break-words">{ins.name}</span>
            )}
            {showLessonCounts && ins.lessons > 0 && (
              <span className="text-[13px] text-ink-2"> ({ins.lessons})</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

/** The compact form for a card: overlapping faces + "A and 2 others". */
export function InstructorStack({ instructors }: { instructors: Instructor[] }) {
  if (instructors.length === 0) return null;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center">
        {instructors.slice(0, 3).map((ins, i) => (
          <span key={ins.id} className={i > 0 ? "-ml-2" : ""}>
            <InstructorAvatar
              instructor={ins}
              className="h-6 w-6 ring-2 ring-[#2b1147]"
            />
          </span>
        ))}
      </span>
      <span className="min-w-0 truncate text-[13px] text-white/75">
        {instructorLabel(instructors)}
      </span>
    </span>
  );
}
