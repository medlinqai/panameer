import Link from "next/link";
import { Suspense } from "react";
import { FilterBar, type FilterDef } from "@/components/casing/FilterBar";
import { relativeDay } from "@/lib/relative-day";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { TypeArt } from "@/components/shop/TypeArt";
import { WantThisJob } from "@/components/work/WantThisJob";
import {
  UNBACKED_TABS,
  WORK_FEED_TABS,
  type WorkCard,
  type WorkFeedTab,
} from "@/lib/work-feed";

export function WorkFeed({
  tab,
  query,
  cards,
  filters,
}: {
  tab: WorkFeedTab;
  query: string;
  cards: WorkCard[];
  basePath?: string;
  filters?: FilterDef[];
}) {

  return (
    <section id="work-feed" className="scroll-mt-6">
      {/* WS-E002: the tab row lives in the Work layout; this is the list for one tab. */}
      <h1 className="mb-3 font-display text-[22px] font-bold">{TITLE[tab] ?? "Work Requests"}</h1>

      {/* WS-E007: search + filters from required fields; state in the URL. */}
      {filters && (
        <Suspense>
          <FilterBar placeholder="Search work requests…" filters={filters} keep={["tab"]} />
        </Suspense>
      )}

      {/* ---- The list ------------------------------------------------------- */}
      {UNBACKED_TABS[tab] ? (
        <EmptyFeed title={`No ${labelFor(tab)} yet`} detail={UNBACKED_TABS[tab]} />
      ) : cards.length === 0 ? (
        <EmptyFeed
          title={query ? `Nothing matches “${query}”` : tab === "invitations" ? "No availability requests yet" : tab === "proposals" ? "No responses yet" : tab === "best" ? "No posted jobs match your skills right now" : "No posted jobs right now"}
          detail={
            query
              // RULING 18: no promise, no date, no apology. *"when this
              ? "No work request matches that search yet."
              : tab === "invitations"
                ? "When a buyer asks if you're available, it shows here."
                : tab === "proposals"
                  ? "Jobs you said you want show here."
                  : "Jobs a buyer asks you about show under Availability Requests. Your profile is how buyers find you, so keep it current."
          }
        />
      ) : (
        <ul className="space-y-3">
          {cards.map((w) => (
            <li key={w.id}>
              <WorkRequestCard card={w} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const TITLE: Partial<Record<WorkFeedTab, string>> = { best: "Best Matches for Your Skills", recent: "All Work Requests", us: "Work Requests in the US", saved: "Saved", invitations: "Availability Requests", proposals: "My Responses" };

function labelFor(tab: WorkFeedTab): string {
  return WORK_FEED_TABS.find((t) => t.id === tab)?.label.toLowerCase() ?? "work";
}

function EmptyFeed({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-brand border border-dashed border-line px-5 py-10 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-lg text-[14px] leading-relaxed text-ink-2">
        {detail}
      </p>
    </div>
  );
}

function WorkRequestCard({ card }: { card: WorkCard }) {
  const meta = [
    card.budgetLabel,
    card.experienceLevel,
    card.duration,
    card.worksite,
    card.location,
    card.roleType,
  ].filter(Boolean) as string[];

  return (
    <article className="overflow-hidden rounded-brand border border-line bg-white transition-colors hover:border-magenta/40">
      {/* THE PHOTO IS DECORATIVE AND DETERMINISTIC (brief_work_card_images). */}
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 w-full shrink-0 bg-bg-soft sm:h-auto sm:w-44 sm:self-stretch">
          {/* PA-E004: the job's Category art (same family as Shop), not a stock photo. */}
          <TypeArt category={card.category} size="band" className="h-full rounded-none sm:aspect-auto" />
        </div>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              {/* THE DETAIL ROUTE EXISTS NOW */}
              <h3 className="text-[16.5px] font-bold">
                <Link href={`/find-work/${card.id}`} className="hover:text-magenta">
                  {card.title}
                </Link>
              </h3>

              {meta.length > 0 && (
                <p className="mt-1 text-[13px] text-ink-2">{meta.join(" · ")}</p>
              )}
              {card.myProposal && (
                <Link href={`/find-work/${card.id}`} data-my-proposal className="mt-2 inline-flex rounded-full bg-state-pending-bg px-2.5 py-0.5 text-[12.5px] font-semibold text-state-pending hover:underline">
                  {card.myProposal}
                </Link>
              )}
              {card.oneClick && <WantThisJob jobId={card.id} rateCents={card.oneClick.rateCents} per={card.oneClick.per} />}

              {card.description && (
                <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink-2">
                  {card.description}
                </p>
              )}

              {card.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.skills.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* WHO IS ASKING */}
            <div className="hidden w-[260px] shrink-0 min-[900px]:block">
              <WhoIsAsking identity={card.identity} />
            </div>
          </div>

          <div className="mt-4 min-[900px]:hidden">
            <WhoIsAsking identity={card.identity} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {/* THE COMPANY NAME CAME OUT OF THIS ROW . It is in */}
            {card.postedAt && <span>Posted {relativeDay(card.postedAt)}</span>}
            {/* THE PER-CARD EARN HOOK, PARKED 2026-09-03 . */}
            {/* <span className="ml-auto font-semibold text-magenta"> */}
          </div>
        </div>
      </div>
    </article>
  );
}
