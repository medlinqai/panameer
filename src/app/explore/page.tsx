import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Btn } from "@/components/marketing/brand";

/**
 * WHERE THE HERO SEARCH LANDS (E016.4) — an honest results surface.
 *
 * There is no public index to search yet. The provider directory needs a
 * session, `/search` is an authed stub, and matching runs against a Work
 * Request rather than a free-text query. So this page does not pretend to have
 * searched: it repeats what was typed, says plainly that results are not live,
 * and hands over the two routes that ARE live today.
 *
 * WHY A PAGE AND NOT A SWALLOWED SUBMIT. The hero used to discard the query and
 * push everyone to /join, on the reasoning that a term which survives into a
 * URL and changes nothing is a worse promise than not appearing to search at
 * all. The reasoning was sound and the conclusion was wrong — a search box that
 * eats what you typed is its own broken promise, and the fix is a destination
 * that tells the truth rather than a control that forgets.
 *
 * PUBLIC BY OMISSION, which is deliberate. `/explore` is not in the proxy
 * matcher, so it never costs a token lookup and an anonymous visitor is never
 * bounced to /login — the failure mode of routing the hero at `/search`, which
 * IS matched and would send every anonymous searcher to a login wall.
 *
 * WHEN A REAL RESULTS PAGE EXISTS, this file is where it goes: the query and
 * the side are already in the URL and already parsed.
 */

export const metadata: Metadata = {
  title: "Explore — Panameer",
  // Not a page anyone should reach from a search engine.
  robots: { index: false, follow: true },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  // Anything that isn't "work" is treated as hiring — the hero only ever sends
  // one of the two, and a hand-typed URL should land somewhere sensible.
  const hiring = sp.mode !== "work";

  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[860px] px-6 py-14 sm:py-20">
          <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
            {hiring ? "Finding experts" : "Finding work"}
          </p>

          {query ? (
            <h1 className="text-[28px] font-extrabold tracking-[-0.8px] sm:text-[36px]">
              We&apos;re not searching yet — but we kept what you typed.
            </h1>
          ) : (
            <h1 className="text-[28px] font-extrabold tracking-[-0.8px] sm:text-[36px]">
              Search isn&apos;t live yet.
            </h1>
          )}

          {/*
            THE QUERY IS SHOWN BACK, ESCAPED BY REACT. It is the whole reason
            this page exists rather than a redirect: the visitor typed
            something, and the least a dead end can do is prove it was heard.
          */}
          {query && (
            <p className="mt-5 rounded-brand border border-line bg-bg-soft px-5 py-4 text-[16px]">
              <span className="text-ink-2">You searched for </span>
              <span className="font-bold">“{query}”</span>
            </p>
          )}

          <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-ink-2">
            {hiring
              ? "Provider search opens with the marketplace. Until then the fastest route to the right expert is a Work Request — you describe the work once, and we match it against every provider's skills."
              : "Work search opens with the marketplace. Until then, build the profile that gets matched: providers with a published profile are the ones Work Requests are matched against."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Btn href={hiring ? "/join?type=buyer" : "/join?type=seller"}>
              {hiring ? "Post a Work Request" : "Create your provider profile"}
            </Btn>
            <Btn href="/learn" variant="ghost">
              Browse free learning paths
            </Btn>
          </div>

          <p className="mt-10 text-[14px] text-ink-2">
            <Link href="/" className="font-semibold underline underline-offset-4 hover:text-magenta">
              Back to the home page
            </Link>
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
