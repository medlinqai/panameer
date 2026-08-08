import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Btn } from "@/components/marketing/brand";
import {
  searchProvidersTeaser,
  searchWorkTeaser,
  type TeaserProvider,
  type TeaserWork,
} from "@/lib/explore";

/**
 * WHERE THE HERO SEARCH LANDS — a teaser, not a placeholder (E032–E037).
 *
 * IT USED TO ADMIT IT HAD NOTHING. The first version showed the query back and
 * said results were not live, which was honest and useless: a visitor searching
 * "procurement" learned that Panameer could not answer, when in fact there are
 * 26 marketplace-visible providers and several of them match. The page was
 * telling the truth about the SEARCH FEATURE while telling a lie about the
 * SUPPLY.
 *
 * So it runs a real query and shows real people — masked. The bait is that
 * experts exist and match; the account buys their identity, their contact
 * details and the rest of the roster. Nothing is invented: if the query matches
 * two providers it shows two, and if it matches none it says none.
 *
 * E221 — NO 0% STATS. Upwork's consultation cards carry Job Success and jobs
 * completed. Nothing has been delivered through Panameer, so both would read 0%
 * and 0 on every card, which is worse than absent — it makes a real expert look
 * like a failed one. Omitted until there is something to count.
 *
 * PUBLIC BY OMISSION, deliberately: `/explore` is not in the proxy matcher, so
 * it costs no token lookup and never bounces an anonymous visitor to /login —
 * the failure mode of routing the hero at `/search`, which IS matched.
 */

export const metadata: Metadata = {
  title: "Explore — Panameer",
  // A search-results surface with masked people on it; not for crawlers.
  robots: { index: false, follow: true },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  // Anything that is not "work" is hiring. The hero only ever sends one of the
  // two, and a hand-typed URL should still land somewhere sensible.
  const hiring = sp.mode !== "work";

  const { cards, total } = hiring
    ? await searchProvidersTeaser(query)
    : await searchWorkTeaser(query);

  // Back to exactly this search after signing in — the gate must not cost
  // anyone the query they typed.
  const backHere = `/explore?${new URLSearchParams({
    mode: hiring ? "hire" : "work",
    ...(query ? { q: query } : {}),
  })}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(backHere)}`;

  const noun = hiring ? "Expert" : "Work Request";
  const remaining = Math.max(0, total - cards.length);

  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />

      <main className="flex-1">
        {/*
          E036/E035 — 1180px, matching every other section on the marketing
          site. The column was 860px, which is a reading measure for prose and
          far too narrow for a results grid: it was what forced the heading and
          the body to wrap two words early, so widening is the wrap fix rather
          than a separate change. No max-w on the heading itself, and the body
          keeps a real prose measure because a 1180px paragraph is unreadable.
        */}
        <div className="mx-auto max-w-[1180px] px-6 py-12 sm:py-16">
          {/* E034 — the eyebrow follows the toggle the visitor came in on. */}
          <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
            {hiring ? "Finding Experts" : "Finding Work"}
          </p>

          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.9px] sm:text-[40px]">
            {cards.length > 0
              ? hiring
                ? "These Experts Match What You Need"
                : "This Work Matches What You Do"
              : hiring
                ? "No Experts Match That Yet"
                : "No Open Work Matches That Yet"}
          </h1>

          {query && (
            <p className="mt-3 text-[16px] text-ink-2">
              Showing matches for <span className="font-bold text-ink">“{query}”</span>
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
                {hiring
                  ? (cards as TeaserProvider[]).map((p) => (
                      <ProviderCard key={p.id} p={p} loginHref={loginHref} />
                    ))
                  : (cards as TeaserWork[]).map((w) => (
                      <WorkCard key={w.id} w={w} loginHref={loginHref} />
                    ))}
              </div>

              {/*
                E032 — THE GATE. The cards are the bait; identity, contact and
                the rest of the roster are the purchase. Only rendered when
                there IS more — promising "all 3" when three are on screen is
                the kind of empty gate that teaches people to ignore gates.
              */}
              <div className="mt-9 rounded-brand border border-magenta/25 bg-magenta/6 p-6">
                <p className="text-[17px] font-bold">
                  {remaining > 0
                    ? `${remaining} more ${remaining === 1 ? noun.toLowerCase() : `${noun.toLowerCase()}s`} match — see them all with a free account.`
                    : `See full profiles with a free account.`}
                </p>
                <p className="mt-1.5 max-w-[680px] text-[15px] leading-relaxed text-ink-2">
                  {hiring
                    ? "Cards show first names only. An account unlocks full profiles, work history and the ability to message or book a consultation."
                    : "An account unlocks the full request, the requester, and the ability to propose."}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {/* E037 — the gate IS the primary action now. */}
                  <Btn href={loginHref}>
                    {remaining > 0
                      ? `Create a Free Account to See All ${total}`
                      : "Create a Free Account"}
                  </Btn>
                  <Btn
                    href={hiring ? "/join?type=buyer" : "/join?type=seller"}
                    variant="ghost"
                  >
                    {hiring ? "Post a Work Request" : "Create Your Provider Profile"}
                  </Btn>
                </div>
              </div>
            </>
          ) : (
            /*
              THE HONEST ZERO. Work mode reaches this for every query today —
              there are no posted Work Requests at all — and hire mode reaches
              it on a term nothing matches. Neither case invents a card.
            */
            <div className="mt-6 max-w-[680px]">
              <p className="text-[17px] leading-relaxed text-ink-2">
                {hiring
                  ? "Nothing in the catalog matches that yet. Try a broader term — a domain like Procurement or Financials, or a system name — or post a Work Request and let providers come to you."
                  : "No Work Requests are open yet — Panameer is pre-launch, and requesters are still arriving. Build your profile now and you'll be in the pool the day the first one posts."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Btn href={hiring ? "/join?type=buyer" : "/join?type=seller"}>
                  {hiring ? "Post a Work Request" : "Create Your Provider Profile"}
                </Btn>
                <Btn href="/" variant="ghost">
                  Back to the Home Page
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
                Back to the Home Page
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
function ProviderCard({ p, loginHref }: { p: TeaserProvider; loginHref: string }) {
  return (
    <article className="flex flex-col rounded-brand border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand">
      <div className="flex items-center gap-3">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photoUrl}
            alt={`${p.firstName}, Panameer provider`}
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-bg-soft text-[18px] font-bold text-ink-2"
          >
            {p.firstName.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold text-ink">{p.firstName}</p>
          {p.location && (
            <p className="truncate text-[13px] text-ink-2">{p.location}</p>
          )}
        </div>
      </div>

      <p className="mt-3.5 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">
        {p.headline}
      </p>

      {p.validated && (
        <p className="mt-2 text-[12.5px] font-bold text-magenta">✓ Validated</p>
      )}

      {p.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {p.skills.slice(0, 3).map((s) => (
            <li
              key={s}
              className="rounded-full bg-bg-soft px-2.5 py-1 text-[12px] text-ink-2"
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {/* `mt-auto` so the rate and CTA sit on one line across a ragged row. */}
      <div className="mt-auto pt-4">
        {p.rate && <p className="text-[15px] font-bold text-ink">{p.rate}</p>}
        {/*
          E032 — GOES TO THE GATE, NOT TO THE PROFILE. /providers/[id] is a
          public route that renders the surname, so linking straight there
          would hand over the very thing the card masks.
        */}
        <Link
          href={loginHref}
          className="mt-2.5 block rounded-full border-[1.5px] border-line px-4 py-2 text-center text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          Book a Consultation
        </Link>
      </div>
    </article>
  );
}

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
          className="mt-2.5 block rounded-full border-[1.5px] border-line px-4 py-2 text-center text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          View Request
        </Link>
      </div>
    </article>
  );
}
