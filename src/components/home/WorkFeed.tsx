import Image from "next/image";
import Link from "next/link";
import { relativeDay } from "@/lib/relative-day";
import { WhoIsAsking } from "@/components/work/WhoIsAsking";
import { WORK_CARD_IMAGE_ALT, workCardImage } from "@/lib/work-images";
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
  basePath = "/dashboard",
}: {
  tab: WorkFeedTab;
  query: string;
  cards: WorkCard[];
  basePath?: string;
}) {
  const onDashboard = basePath === "/dashboard";
  const href = (t: WorkFeedTab) =>
    `${basePath}?tab=${t}${query ? `&q=${encodeURIComponent(query)}` : ""}` +
    (onDashboard ? "#work-feed" : "");

  return (
    <section id="work-feed" className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {}
        {onDashboard ? (
          <h2 className="font-display text-[19px] font-bold">Find Work</h2>
        ) : (
          <h1 className="font-display text-[19px] font-bold">Work Requests</h1>
        )}
        {}
        {}
      </div>

      {/* ---- Tabs ---------------------------------------------------------- */}
      {}
      {}
      <div
        data-testid="work-feed-tabs"
        className="-mx-1 mb-3 flex flex-wrap items-end gap-x-1 gap-y-0 border-b border-line px-1"
      >
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
        action={basePath}
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
          className="shrink-0 bg-magenta px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Search
        </button>
        {}
        <button
          type="button"
          disabled
          title="Filters open when buyers start posting work"
          className="shrink-0 border-[1.5px] border-line px-5 py-2 text-[14px] font-bold text-ink-2 opacity-50"
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
              // RULING 18: no promise, no date, no apology. *"when this
              ? "No work request matches that search yet."
              : "No buyer has posted a work request yet. Your profile is what they find you by, so keep it current."
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
    <article className="overflow-hidden rounded-brand border border-line bg-white transition-colors hover:border-magenta/40">
      {/* THE PHOTO IS DECORATIVE AND DETERMINISTIC (brief_work_card_images). */}
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 w-full shrink-0 bg-bg-soft sm:h-auto sm:w-44 sm:self-stretch">
          <Image
            src={workCardImage(card.id)}
            alt={WORK_CARD_IMAGE_ALT}
            fill
            sizes="(max-width: 640px) 100vw, 176px"
            className="object-cover"
          />
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
