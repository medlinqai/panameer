import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Btn } from "@/components/marketing/brand";
import { searchWorkTeaser, type TeaserWork } from "@/lib/explore";
import { BrowseTalentGrid } from "@/components/public/BrowseTalentGrid";

export const metadata: Metadata = {
  title: "Explore — Panameer",
  // A search-results surface with masked people on it; not for crawlers.
  robots: { index: false, follow: true },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    mode?: string;
    country?: string;
    years?: string;
    take?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  // Anything that is not "work" is hiring. The hero only ever sends one of the
  // two, and a hand-typed URL should still land somewhere sensible.
  const hiring = sp.mode !== "work";

  if (hiring) {
    return (
      <div className="marketing-surface masked-surface flex min-h-screen flex-col bg-white font-body text-ink dark:bg-ink dark:text-white">
        <MarketingHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-[1120px] px-6 py-9 sm:py-12">
            <BrowseTalentGrid
              q={query || undefined}
              country={sp.country || undefined}
              minYears={sp.years ? Number(sp.years) || undefined : undefined}
              take={sp.take ? Number(sp.take) || undefined : undefined}
            />
          </div>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  const { cards, total } = await searchWorkTeaser(query);

  // Back to exactly this search after signing in — the gate must not cost
  // anyone the query they typed.
  const backHere = `/explore?${new URLSearchParams({
    mode: "work",
    ...(query ? { q: query } : {}),
  })}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(backHere)}`;

  const noun = "Work Request";
  const remaining = Math.max(0, total - cards.length);

  return (
    <div className="marketing-surface masked-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[1180px] px-6 py-12 sm:py-16">
          {/* E034 — the eyebrow follows the toggle the visitor came in on. */}
          <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
            Finding work
          </p>

          <h1 className="text-balance text-[30px] font-extrabold leading-[1.1] tracking-[-0.9px] sm:text-[40px]">
            {cards.length > 0
              ? "This work matches what you do"
              : "No open work matches that yet"}
          </h1>

          {query && (
            <p className="mt-3 text-[16px] text-ink-2">
              Showing matches for <span className="font-bold text-ink">&ldquo;{query}&rdquo;</span>
              {total > 0 && (
                <>
                  {" "}
                  · {total} {noun.toLowerCase()}
                  {total === 1 ? "" : "s"} found
                </>
              )}
            </p>
          )}

          {cards.length > 0 ? (
            <>
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {(cards as TeaserWork[]).map((w) => (
                  <WorkCard key={w.id} w={w} loginHref={loginHref} />
                ))}
              </div>

              {/*
                E032 — THE GATE. The cards are the bait; identity, contact and
                the rest of the roster are the purchase.
              */}
              <div className="mt-9 rounded-brand border border-magenta/25 bg-magenta/6 p-6">
                <p className="text-[17px] font-bold">
                  {remaining > 0
                    ? `${remaining} more ${remaining === 1 ? noun.toLowerCase() : `${noun.toLowerCase()}s`} match — see them all with a free account.`
                    : `See full profiles with a free account.`}
                </p>
                <p className="mt-1.5 max-w-[680px] text-[15px] leading-relaxed text-ink-2">
                  An account unlocks the full request, the requester, and the
                  ability to propose.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Btn href={loginHref}>
                    {remaining > 0
                      ? `Create a free account to see all ${total}`
                      : "Create a free account"}
                  </Btn>
                  {/* ⚠ `/join` FLAT (`P1-J1.1-E234`, 2026-08-30). */}
                  <Btn href="/join" variant="ghost">
                    Create your provider profile
                  </Btn>
                </div>
              </div>
            </>
          ) : (
            /*
              THE HONEST ZERO. Work mode reaches this for every query today —
              there are no posted Work Requests at all — and it invents nothing.
            */
            <div className="mt-6 max-w-[680px]">
              <p className="text-[17px] leading-relaxed text-ink-2">
                No Work Requests are open yet — Panameer is pre-launch, and
                requesters are still arriving. Build your profile now and
                you&apos;ll be in the pool the day the first one posts.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {/* ⚠ `/join` flat — same reasoning as the CTA above (`E234`). */}
                <Btn href="/join">Create your provider profile</Btn>
                <Btn href="/" variant="ghost">
                  Back to the home page
                </Btn>
              </div>
            </div>
          )}

          {cards.length > 0 && (
            <p className="mt-8 text-[14px] text-ink-2">
              <Link
                href="/"
                className="font-semibold underline underline-offset-4 hover:text-magenta"
              >
                Back to the home page
              </Link>
            </p>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

/**
 * A masked expert.
 *
 * THE PHOTO IS RENDERED HERE RATHER THAN THROUGH <Avatar>, and that is the
 * masking again: Avatar takes firstName AND lastName and puts both into its
 * `alt` and its initials fallback. Passing a surname to a component whose job
 * is to display it, on the one page built not to display it, is how a mask
 * leaks through an accessibility attribute.
 */
/** The provider-side twin. Nothing renders it today — there is no posted work. */
function WorkCard({ w, loginHref }: { w: TeaserWork; loginHref: string }) {
  return (
    <article className="flex flex-col rounded-brand border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand">
      <p className="line-clamp-2 text-[16px] font-bold leading-snug text-ink">
        {w.title}
      </p>
      {w.company && <p className="mt-1.5 text-[13px] text-ink-2">{w.company}</p>}
      {w.location && <p className="text-[13px] text-ink-2">{w.location}</p>}

      {w.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {w.skills.slice(0, 3).map((s) => (
            <li
              key={s}
              className="rounded-full bg-bg-soft px-2.5 py-1 text-[12px] text-ink-2"
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        {w.budget && <p className="text-[15px] font-bold text-ink">{w.budget}</p>}
        <Link
          href={loginHref}
          className="mt-2.5 block border-[1.5px] border-line px-4 py-2 text-center text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          View request
        </Link>
      </div>
    </article>
  );
}
