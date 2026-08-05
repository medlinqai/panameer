import Link from "next/link";
import { relativeDay } from "@/lib/relative-day";
import {
  UNBACKED_TABS,
  WORK_FEED_TABS,
  type WorkCard,
  type WorkFeedTab,
} from "@/lib/work-feed";

/**
 * THE WORK FEED (brief_sp_dashboard WS-B) — cards, not a table.
 *
 * This replaces the four empty KPI tiles and the Open-Work TABLE that were the
 * dashboard body. Both were the wrong shape twice over: the tiles reported
 * numbers nothing could produce, and a table is a scanning tool for people who
 * already know what they are looking for. A provider arriving at their
 * dashboard is browsing, and browsing wants cards.
 *
 * SERVER COMPONENT. Tabs and search are links carrying query params rather than
 * client state, so a filtered feed is a URL somebody can bookmark, share or
 * come back to — and the attention strip's "New Matches" card can deep-link
 * straight into it.
 */
export function WorkFeed({
  tab,
  query,
  cards,
}: {
  tab: WorkFeedTab;
  query: string;
  cards: WorkCard[];
}) {
  const href = (t: WorkFeedTab) =>
    `/dashboard?tab=${t}${query ? `&q=${encodeURIComponent(query)}` : ""}#work-feed`;

  return (
    <section id="work-feed" className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="font-display text-[19px] font-bold">Find Work</h2>
        <p className="text-[13px] text-ink-2">
          Responding earns Community Credits.
        </p>
      </div>

      {/* ---- Tabs ---------------------------------------------------------- */}
      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto border-b border-line px-1">
        {WORK_FEED_TABS.map((t) => (
          <Link
            key={t.id}
            href={href(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors " +
              (tab === t.id
                ? "border-magenta text-magenta"
                : "border-transparent text-ink-2 hover:text-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ---- Search + filters ---------------------------------------------- */}
      <form
        action="/dashboard"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="tab" value={tab} />
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 py-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search work requests…"
            aria-label="Search work requests"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-2/70"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-magenta px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Search
        </button>
        {/*
          FILTERS IS DISABLED, not absent. The design calls for it and the shape
          matters, but there are no posted work requests to filter and no filter
          model behind it — a live-looking control that opened an empty panel
          would waste the click.
        */}
        <button
          type="button"
          disabled
          title="Filters open when buyers start posting work"
          className="shrink-0 rounded-full border-[1.5px] border-line px-5 py-2 text-[14px] font-bold text-ink-2 opacity-50"
        >
          Filters
        </button>
      </form>

      {/* ---- The list ------------------------------------------------------- */}
      {UNBACKED_TABS[tab] ? (
        <EmptyFeed title={`No ${labelFor(tab)} yet`} detail={UNBACKED_TABS[tab]} />
      ) : cards.length === 0 ? (
        <EmptyFeed
          title={query ? `Nothing matches “${query}”` : "No work posted yet"}
          detail={
            query
              ? "Buyers aren't posting work requests on Panameer yet, so there is nothing to match against."
              : "Buyers aren't posting work requests yet. Your profile is what they find you by in the meantime — keep it current and you'll be near the top when this opens."
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
    <article className="rounded-brand border border-line bg-white p-5 transition-colors hover:border-magenta/40">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {/*
            `/work/[id]` DOES NOT EXIST YET — there is no work-request detail
            page, and building one is beyond this brief. The link is written to
            where that page belongs rather than to a stand-in, and it is
            unreachable today because no buyer has posted a work request, so no
            card renders. It becomes live the moment the detail route lands.
          */}
          <h3 className="text-[16.5px] font-bold">
            <Link href={`/work/${card.id}`} className="hover:text-magenta">
              {card.title}
            </Link>
          </h3>

          {meta.length > 0 && (
            <p className="mt-1 text-[13px] text-ink-2">{meta.join(" · ")}</p>
          )}

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

        {/* The buyer's mark, when they have one. Absent rather than a grey
            placeholder square — an empty logo slot on every card is noise. */}
        {card.companyLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.companyLogoUrl}
            alt={card.companyName ?? ""}
            className="h-10 w-10 shrink-0 rounded-[8px] object-cover"
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
        {card.companyName && <span className="font-semibold">{card.companyName}</span>}
        {card.postedAt && <span>Posted {relativeDay(card.postedAt)}</span>}
        {/*
          THE EARN HOOK. Stated as the rule rather than a number, because
          CREDIT_RULES lands with the ledger in the master brief's PHASE 3 and a
          hardcoded "100" here would be a second source that drifts the moment
          Scott tunes the first.
        */}
        <span className="ml-auto font-semibold text-magenta">
          Responding earns Community Credits
        </span>
      </div>
    </article>
  );
}
