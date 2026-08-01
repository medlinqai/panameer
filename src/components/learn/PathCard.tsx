import Link from "next/link";
import type { LearnCard } from "@/lib/learn-home";
import { InstructorStack } from "@/components/learn/InstructorBadge";

/**
 * THE Learning-Path card (brief_learn_experience WS1/WS6).
 *
 * This brief owns it and `brief_provider_home_page` WS5's Build-Skills section
 * reuses it — the shared-component note exists so it isn't built twice and then
 * drifts into two cards that look almost the same.
 *
 * The face is the point: a path taught by people you can look up and hire is
 * the difference between a course library and a marketplace's course library.
 *
 * MULTI-INSTRUCTOR (WS6, corrected). A path is often taught by more than one
 * person — Advanced Procurement is 85 lessons by one and 18 by another — so the
 * hero image is the LEAD's, the person who taught the most of it, and the
 * stacked avatars underneath say how many others there are. A single face only
 * appears when there genuinely is one. Fronting a two-teacher path with one
 * portrait would be a quiet misattribution on the most-seen surface in Learn.
 */
export function PathCard({ card, href }: { card: LearnCard; href?: string }) {
  const lead = card.instructors[0] ?? null;
  const initials =
    lead?.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P";

  return (
    <Link
      href={href ?? `/learn/${card.slug}`}
      className="group flex flex-col overflow-hidden rounded-brand bg-learn-card text-white shadow-brand transition-transform hover:-translate-y-0.5"
    >
      {/*
        16:9 when the card carries authored cover art, 4:3 when it is fronted by
        a portrait. The imported covers are 960×540 designs WITH TEXT ON THEM
        ("Enterprise Resource Planning Overview"); cropping them to a portrait
        frame cut the wording in half. Faces crop fine and read better tall.
      */}
      <div
        className={
          "relative w-full overflow-hidden bg-learn-card " +
          (card.coverImage ? "aspect-video" : "aspect-[4/3]")
        }
      >
        {/*
          THE PATH'S OWN COVER WINS when there is one.

          WS6 made this card instructor-fronted, and that was right when the
          only image available was a face. The thumbnail import brought in art
          drawn FOR these paths ("ERP Overview", "oracle cloud careers") — a
          picture of the subject beats a portrait of the teacher on a catalog
          card, and the instructor is still named with their avatar underneath,
          so nothing is lost. Where no cover was imported the face still leads,
          which is most of the catalog today.
        */}
        {(() => {
          if (card.coverImage) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.coverImage}
                alt=""
                className="h-full w-full object-cover"
              />
            );
          }
          const withPhoto = card.instructors.find((i) => i.photoUrl);
          if (withPhoto) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={withPhoto.photoUrl!}
                alt={withPhoto.name}
                className="h-full w-full object-cover object-top"
              />
            );
          }
          return (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-[38px] font-bold text-white/40">
                {initials}
              </span>
            </div>
          );
        })()}

        {card.enrolled && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-learn-card">
            {card.progress === 100 ? "Complete" : "Enrolled"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-[18px] font-bold leading-snug">{card.title}</p>

        {card.instructors.length > 0 && (
          <div className="mt-2">
            <InstructorStack instructors={card.instructors} />
          </div>
        )}

        <p className="mt-auto pt-3 text-[12.5px] text-white/60">
          {card.lessons} lesson{card.lessons === 1 ? "" : "s"}
          {card.playable > 0 && ` · ${card.playable} ready`}
        </p>

        {/*
          The progress bar only exists once you're enrolled. An empty 0% bar on
          every card would read as "you've done nothing here" across a catalog
          you haven't started, which is discouraging and untrue.
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
