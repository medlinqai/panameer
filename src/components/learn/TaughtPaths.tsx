import Link from "next/link";
import type { TaughtPath } from "@/lib/learn-home";

/**
 * "Learn from <name>" — the courses a consultant teaches, on their profile
 * (brief_learn_experience WS7 / E137).
 *
 * This is the half of the loop that was missing. A course already linked to its
 * instructor's profile; nothing linked a profile back to their courses, so a
 * buyer evaluating a consultant had no way to see them actually teach the thing
 * they claim to know. On a platform selling "the best consultants in the
 * world", hours of them explaining their subject is the strongest evidence
 * available — stronger than a headline or a self-reported skill list.
 *
 * RENDERS NOTHING when they teach nothing. An empty "Courses" heading on most
 * profiles would read as a missing feature rather than an honest absence.
 */
export function TaughtPaths({
  paths,
  name,
  isOwner = false,
}: {
  paths: TaughtPath[];
  name: string;
  isOwner?: boolean;
}) {
  if (paths.length === 0) return null;

  const firstName = name.split(/\s+/)[0] || name;
  // Count what THEY teach, not what the paths contain. A co-taught path where
  // they gave 18 of 105 lessons must not be summed as 105.
  const totalLessons = paths.reduce((n, p) => n + (p.taughtByThem || p.lessons), 0);

  return (
    <section className="rounded-brand border border-line bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-[20px] font-bold">
          {isOwner ? "Courses You Teach" : `Learn From ${firstName}`}
        </h2>
        <p className="text-[13.5px] text-ink-2">
          {paths.length} learning path{paths.length === 1 ? "" : "s"} ·{" "}
          {totalLessons} lesson{totalLessons === 1 ? "" : "s"} · free
        </p>
      </div>

      <p className="mt-1.5 text-[14.5px] text-ink-2">
        {isOwner
          ? "These are on Panameer Learn, open to anyone. Buyers see them on your profile."
          : `${firstName} teaches these on Panameer Learn — free, and a fair way to judge how they explain their work.`}
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {paths.map((p) => (
          <li key={p.id}>
            <Link
              href={`/learn/${p.slug}`}
              className="flex h-full flex-col rounded-[12px] border border-line p-4 transition-colors hover:border-magenta"
            >
              <p className="font-bold leading-snug">{p.title}</p>
              {p.group && <p className="mt-0.5 text-[13px] text-ink-2">{p.group}</p>}
              <p className="mt-auto pt-2 text-[12.5px] text-ink-2">
                {/*
                  On a co-taught path, say which share is theirs — "18 of 105
                  lessons" is both more honest and more useful than either
                  number alone.
                */}
                {p.taughtByThem > 0 && p.taughtByThem < p.lessons
                  ? `${p.taughtByThem} of ${p.lessons} lessons`
                  : `${p.lessons} lesson${p.lessons === 1 ? "" : "s"}`}
                {p.playable > 0 && (
                  <span className="text-emerald-700"> · {p.playable} ready to watch</span>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
