import Link from "next/link";
import type { LearnCard } from "@/lib/learn-home";

type Instructor = NonNullable<LearnCard["instructor"]>;

/**
 * "Instructor: <name>" — the design ref's magenta link (WS2), and one half of
 * the profile↔courses loop (WS7).
 *
 * The name is a LINK only when the instructor has a marketplace-visible
 * profile. That's the whole differentiator: on a platform selling consultants,
 * the person teaching you is someone you can look up and hire. But a link to a
 * profile the marketplace would refuse to render is worse than plain text, so
 * the visibility check happens in the query and this component just honours it.
 */
export function InstructorBadge({
  instructor,
  size = "md",
}: {
  instructor: Instructor;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const initials =
    instructor.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P";

  return (
    <span className="flex items-center gap-3">
      {instructor.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={instructor.photoUrl}
          alt=""
          className={`${dim} shrink-0 rounded-full border border-line object-cover`}
        />
      ) : (
        <span
          className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-bg-soft text-[13px] font-bold text-ink-2`}
        >
          {initials}
        </span>
      )}
      <span className={size === "sm" ? "text-[14px]" : "text-[17px]"}>
        <span className="text-ink-2">Instructor: </span>
        {instructor.profileSlug ? (
          <Link
            href={`/providers/${instructor.profileSlug}`}
            className="font-bold text-magenta underline underline-offset-4 hover:text-magenta-dark"
          >
            {instructor.name}
          </Link>
        ) : (
          <span className="font-bold">{instructor.name}</span>
        )}
      </span>
    </span>
  );
}
