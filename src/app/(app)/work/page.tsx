import Link from "next/link";
import { guardPage } from "@/lib/guard";

/**
 * FIND WORK — search results (brief_provider_home_page_v2, stub).
 *
 * The search ENGINE is explicitly out of scope; the brief asks to wire the box
 * and land somewhere honest. So this reads back what was searched for and says
 * plainly that matching isn't switched on yet.
 *
 * Naming the query matters more than it looks: a provider who typed something
 * specific needs to see that it arrived, or the box feels broken rather than
 * unfinished.
 */
export default async function FindWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await guardPage("canProvideServices");
  const q = (await searchParams).q?.trim();

  return (
    <div className="mx-auto w-full max-w-3xl py-6">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-magenta">
        Find Work
      </p>
      <h1 className="mt-1.5 font-display text-[28px] font-bold tracking-[-0.5px]">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search Open Job Postings"}
      </h1>

      <div className="mt-6 rounded-brand border border-line p-7">
        <p className="text-[16px] font-bold">Job search is coming soon.</p>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-2">
          {q ? (
            <>
              We&apos;ve got your search — <b className="text-ink">{q}</b> — but
              buyers aren&apos;t posting work requests on Panameer yet, so there is
              nothing to match it against. Your profile is what buyers find you by
              in the meantime.
            </>
          ) : (
            <>
              Buyers aren&apos;t posting work requests yet. Your profile is what
              they find you by in the meantime — keep it current and you&apos;ll be
              near the top when this opens.
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Review My Profile
          </Link>
          <Link
            href="/learn"
            className="rounded-full border-[1.5px] border-line px-6 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
          >
            Build Skills on Learn
          </Link>
        </div>
      </div>
    </div>
  );
}
