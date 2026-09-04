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
  /**
   * Which route the tabs link back to. The dashboard renders this as its body
   * and /work renders it as the page (E216); parameterising the base is what
   * lets one component serve both without the tabs sending a Find Work visitor
   * to the dashboard.
   */
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
        {/*
          ⚠⚠ THE HEADING LEVEL AND ITS WORDS BOTH DEPEND ON WHERE THIS RENDERS
          (`P1-ALL-E380` WS-1b), AND THAT IS NOT OVER-ENGINEERING — IT IS THE
          ONLY CORRECT ANSWER. This component serves TWO pages, and the naive
          fix would have broken one of them.

          ⚠ SUPERSEDED, QUOTED NOT DELETED: this was a single unconditional
          `<h2 className="font-display text-[19px] font-bold">Find Work</h2>`.

          · ON `/find-work` IT IS THE PAGE. The page had NO `<h1>` AT ALL, which
            is a real accessibility defect and not just a naming one — a screen
            reader got no page title. So here it is an `<h1>` reading `Work
            Requests`, the JOURNEY's name, per `E378`'s rule that the rail
            carries the one-word verb and the page carries the journey.

          · ⚠⚠ ON `/dashboard` IT IS A SECTION, AND IT MUST STAY AN `<h2>`
            SAYING `Find Work`. THE DASHBOARD ALREADY HAS ITS OWN `<h1>` —
            *"Welcome Back, {firstName}"* — so promoting this unconditionally
            would have given that page TWO `<h1>` ELEMENTS: a WORSE
            accessibility defect than the one being fixed, introduced while
            fixing it. CHECKED BEFORE CHANGING, not after.
            ⚠ And `Work Requests` would be wrong there anyway: on the dashboard
            this is one section among several, and `Find Work` is what that
            section is.

          ⚠ `onDashboard` IS THE EXISTING CONTEXT SIGNAL, already derived above
          for the tab hrefs. No new prop was added — the component already knew
          which of its two homes it was in.

          ⚠ NOTHING DEPENDED ON THE OLD `<h2>`. Verified before touching it:
          `e2e/` and `scripts/` were searched for a selector on it and there is
          none — the only `h2` selectors in `e2e/` are `.hiw-h2` on the
          marketing pages, a different element entirely. Reported at `E380`.
        */}
        {onDashboard ? (
          <h2 className="font-display text-[19px] font-bold">Find Work</h2>
        ) : (
          <h1 className="font-display text-[19px] font-bold">Work Requests</h1>
        )}
        {/* ⚠ CREDITS COPY PARKED 2026-09-03 (`P1-ALL-E375`) — the feature is commented
            out, so a live surface must not keep promising it. See `src/lib/credits.ts`. */}
        {/*
        <p className="text-[13px] text-ink-2">
          Responding earns Community Credits.
        </p>
        */}
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
    <article className="overflow-hidden rounded-brand border border-line bg-white transition-colors hover:border-magenta/40">
      {/*
        THE PHOTO IS DECORATIVE AND DETERMINISTIC (brief_work_card_images).
        Chosen from the id so the same job keeps the same picture across
        reloads — a card whose image changes on refresh reads as broken.

        A BANNER ON MOBILE, A THUMBNAIL ABOVE sm. Stacking full-width under 640px
        is what keeps the text column readable on a phone; side-by-side, a fixed
        176px rail keeps every card's text starting at the same x, which is what
        makes a list of them scannable. `sizes` matches those two cases so the
        browser never fetches the 800px file to paint a 176px box.
      */}
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

            {/*
              ── ⚠⚠ WHO IS ASKING (`P1-J4-E025`) ─────────────────────────────

              SCOTT: *"I SEE THEIR REQUEST… WANT TO SEE WHO THEY ARE JUST LIKE I
              WOULD IN LINKEDIN… AND THERE IS ONLY A TITLE? LOOKS LIKE A SCAM
              FOR A SITE I DO NOT KNOW WELL."*

              ⚠ BESIDE THE REQUEST ON A WIDE CARD, UNDER IT ON A NARROW ONE. The
              block is four rows of prose; squeezed into a 200px column beside
              the description at 390px it renders a word per line, which is the
              failure `CoverageCard`'s closing strip already documents.

              ⚠⚠ THIS IS THE ONLY SURFACE A PROVIDER CAN SEE A WORK REQUEST ON
              TODAY, which is why the block lands here. `/work/[id]` — the
              detail route this card's title has always linked to — STILL DOES
              NOT EXIST; that 404 is pre-existing and was reported at `E025`
              rather than fixed inside this brief. `WhoIsAsking` takes a
              `BuyerIdentity` and reads nothing else, so it moves there unchanged
              on the day that page lands.

              ⚠ SUPERSEDED, quoted not deleted: a bare 40px company logo sat here
              — *"The buyer's mark, when they have one. Absent rather than a grey
              placeholder square."* The logo is now inside the block, where it is
              captioned by the company name and suppressed with it when the
              request is confidential. A floating logo beside a redacted name
              would have named the company anyway.
            */}
            <div className="hidden w-[260px] shrink-0 min-[900px]:block">
              <WhoIsAsking identity={card.identity} />
            </div>
          </div>

          <div className="mt-4 min-[900px]:hidden">
            <WhoIsAsking identity={card.identity} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {/*
              ⚠ THE COMPANY NAME CAME OUT OF THIS ROW (`P1-J4-E025`). It is in
              the "Who's asking" block above, where it is redacted when the
              request is confidential; leaving a second unredacted copy down here
              would have defeated the redaction entirely.
            */}
            {card.postedAt && <span>Posted {relativeDay(card.postedAt)}</span>}
            {/* ⚠ THE PER-CARD EARN HOOK, PARKED 2026-09-03 (`P1-ALL-E375`).
                ⚠ ITS REASONING IS PRESERVED HERE VERBATIM because the wrapper
                below cannot contain a nested delimiter: *"THE EARN HOOK. Stated
                as the rule rather than a number, because CREDIT_RULES lands with
                the ledger in the master brief's PHASE 3 and a hardcoded '100'
                here would be a second source that drifts the moment Scott tunes
                the first."* That rule still applies if Credits return. */}
            {/*
            <span className="ml-auto font-semibold text-magenta">
              Responding earns Community Credits
            </span>
            */}
          </div>
        </div>
      </div>
    </article>
  );
}
