import Link from "next/link";
import type { LearnCard } from "@/lib/learn-home";

/**
 * THE Learning-Path card (brief_learn_experience WS1).
 *
 * This brief owns it and `brief_provider_home_page` WS5's Build-Skills section
 * reuses it — the shared-component note exists so it isn't built twice and then
 * drifts into two cards that look almost the same.
 *
 * The face is the point. One instructor owns a whole path (WS6), so the card
 * shows THAT person, pulled from their live profile photo — not a stock face
 * repeated across the grid. A path taught by someone you can look up and hire is
 * the difference between a course library and a marketplace's course library.
 */
export function PathCard({ card, href }: { card: LearnCard; href?: string }) {
  const initials =
    card.instructor?.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P";

  return (
    <Link
      href={href ?? `/learn/${card.slug}`}
      className="group flex flex-col overflow-hidden rounded-brand bg-[#2b1147] text-white shadow-brand transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#2b1147]">
        {card.instructor?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.instructor.photoUrl}
            alt={card.instructor.name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-[38px] font-bold text-white/40">
              {initials}
            </span>
          </div>
        )}

        {card.enrolled && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-[#2b1147]">
            {card.progress === 100 ? "Complete" : "Enrolled"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-[18px] font-bold leading-snug">{card.title}</p>

        {card.instructor && (
          <p className="mt-1 text-[13px] text-white/70">{card.instructor.name}</p>
        )}

        <p className="mt-auto pt-3 text-[12.5px] text-white/60">
          {card.lessons} lesson{card.lessons === 1 ? "" : "s"}
          {card.playable > 0 && ` · ${card.playable} ready`}
        </p>

        {/*
          The progress bar only exists once you're enrolled. Showing an empty
          0% bar on every card would read as "you've done nothing here" across a
          catalog you haven't started, which is discouraging and untrue.
        */}
        {card.enrolled && card.progress !== null && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-magenta"
                style={{ width: `${Math.max(card.progress, 2)}%` }}
              />
            </div>
            <p className="mt-1 text-[12px] text-white/70">
              {card.progress}% · {card.completedLessons} of {card.lessons} done
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
