import Link from "next/link";
import { FindWorkHero } from "@/components/home/FindWorkHero";
import { PathCard } from "@/components/learn/PathCard";
import type { LearnCard } from "@/lib/learn-home";

/**
 * Provider HOME — the app hub (E134-provider-home-design.png).
 *
 * DISTINCT FROM THE PROFILE, which is the whole point of this brief. /dashboard
 * used to render the provider's full profile view, so "Home" and "my profile"
 * were one long page and the post-publish landing was both at once. Home is now
 * a hub — go find work, go learn something — and the profile lives behind Edit
 * Profile and the public profile route.
 *
 * Two sections, in the mockup's order: FIND WORK then BUILD SKILLS. Both
 * eyebrow labels are brand magenta, which is what the PNG samples as.
 */
export function ProviderHome({
  chips,
  paths,
}: {
  chips: string[];
  paths: LearnCard[];
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-1 py-2">
      <FindWorkHero chips={chips} />

      <section>
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-magenta">
          Build Skills
        </p>
        <h2 className="mt-1.5 font-display text-[27px] font-bold tracking-[-0.5px] sm:text-[31px]">
          Learning Path Registration (It&apos;s Free)
        </h2>

        {paths.length === 0 ? (
          <p className="mt-5 rounded-brand border border-line p-6 text-[14.5px] text-ink-2">
            The learning catalog is being loaded.{" "}
            <Link href="/learn" className="font-bold text-magenta hover:underline">
              Browse Learn
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((p) => (
                <PathCard key={p.id} card={p} variant="compact" />
              ))}
            </div>
            <Link
              href="/learn"
              className="mt-6 inline-block text-[14.5px] font-bold text-magenta hover:underline"
            >
              See all learning paths →
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
