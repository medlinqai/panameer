import Link from "next/link";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";
import { BeatTabs, type BeatTab } from "@/components/marketing/BeatTabs";
import { BuyerSellerFlow } from "@/components/marketing/diagrams/BuyerSellerFlow";
import { SellerHub } from "@/components/marketing/diagrams/SellerHub";

/**
 * "Why Panameer" on `/` — the four-beat primer carousel (E074, E076).
 *
 * A SERVER COMPONENT that renders one client island. Everything below —
 * headings, all four panels, both diagrams, every link — is server-rendered and
 * handed to <BeatTabs> as props, so none of it reaches the client bundle and
 * all of it is in the prerendered HTML. The only JavaScript this section ships
 * is the tab state and the keyboard handler.
 *
 * WHY A CAROUSEL AND NOT FOUR STACKED SECTIONS. The mock stacks them, and
 * stacked they are roughly four screens of primer between the hero and the
 * fork — on a page whose job is to hand the reader to their own page. The
 * carousel keeps the map (four cards, always visible) and makes the territory
 * opt-in. Nothing is lost for search, because every panel is still in the HTML.
 *
 * ⚠ NOT THE SAME COMPONENT AS WhyPanameer.tsx, which still renders the video
 * tiles on /for-buyers and /for-providers. Two treatments of one idea is a real
 * cost and worth stating: the fork pages want an audience-specific "why", this
 * wants an agnostic primer, and merging them before the fork-page copy exists
 * would be guessing. Expect them to converge.
 */

const TABS: BeatTab[] = [
  { n: 1, word: "Learn", caption: "Learn from Experts" },
  { n: 2, word: "Connect", caption: "Connect Buyers & Sellers" },
  { n: 3, word: "Create", caption: "Create Solutions to Problems" },
  { n: 4, word: "Settle", caption: "Settle with Ease & Speed" },
];

/** The shared shape of the Learn and Settle panels: intro + four cards. */
type Card = { n: number; title: string; body: string; href?: string };

/*
  ⚠ LINKS ONLY WHERE A PUBLIC PAGE EXISTS (E077).

  One card in this section links: Online Courses → /learn, the real public
  catalogue. Everything else describes something whose public page does not
  exist yet, and the only destinations available are behind login —
  /community/forums and /community/mentors are both real, both authed.

  Sending a card there would put a signup ask in the middle of `/`, which E077
  explicitly rules out: the fork at the bottom is this page's only conversion.
  So the rest are plain text. Unlinked copy is the honest stub; a link to a
  login wall dressed as a feature tour is not.

  ⚠ AND ONE PRICE IS A CLAIM, NOT A FACT. "from $49.99 / 15 min" comes from the
  brief and the mock. Mentoring is not purchasable — there is no booking flow
  and no price stored anywhere — so this is a stated intention on a page that
  otherwise refuses to invent numbers. Flagged rather than silently shipped.
*/
const LEARN_CARDS: Card[] = [
  {
    n: 1,
    title: "Online Courses",
    body: "Guided learning paths on the applications real businesses run — each ending in a certification.",
    href: "/learn",
  },
  {
    n: 2,
    title: "Community Events",
    body: "Weekly forums and group sessions with the experts who actually do the work.",
  },
  {
    n: 3,
    title: "One-on-One Mentoring",
    body: "Private, on-demand time with a vetted expert — from $49.99 / 15 min.",
  },
  {
    n: 4,
    title: "Pre-Project Training",
    body: "Get your team ready before the work starts, so nothing slows the project down.",
  },
];

const SETTLE_CARDS: Card[] = [
  {
    n: 1,
    title: "One Settlement",
    body: "Pay every expert through a single, clean settlement — not a stack of invoices to chase.",
  },
  {
    n: 2,
    title: "No Employment Risk",
    body: "No workers' comp, no misclassification exposure — engage experts without the liability.",
  },
  {
    n: 3,
    title: "Flexible Terms",
    body: "By the hour, by milestone, or by draw-down — whatever fits the work.",
  },
  {
    n: 4,
    title: "Fast & Secure",
    body: "Seller submits, buyer approves, Panameer settles — paid quickly, on-platform.",
  },
];

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const inner = (
          <>
            <span className="font-display text-[34px] font-bold leading-none text-magenta/25">
              {String(c.n).padStart(2, "0")}
            </span>
            <h4 className="mt-2 text-[18px] font-bold text-ink">{c.title}</h4>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
            {c.href && (
              <span className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-bold text-magenta">
                Browse Learning Paths
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            )}
          </>
        );
        const shell =
          "group flex flex-col rounded-brand border border-line bg-white p-5";
        return c.href ? (
          <Link
            key={c.title}
            href={c.href}
            className={`${shell} transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand`}
          >
            {inner}
          </Link>
        ) : (
          <div key={c.title} className={shell}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Each panel opens on its own intro, so the tab's meaning is restated once. */
function PanelIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 max-w-[820px] text-balance text-[16.5px] leading-relaxed text-ink-2">
      {children}
    </p>
  );
}

export function WhyPanameerPrimer() {
  const panels = [
    <div key="learn">
      <PanelIntro>
        Panameer offers several methods and price points to learn from the
        experts who have been transforming global businesses for the past 20
        years.
      </PanelIntro>
      <CardGrid cards={LEARN_CARDS} />
    </div>,

    <div key="connect">
      <PanelIntro>
        Panameer connects the buyers and sellers of Enterprise Systems and AI
        automation services using one clear, end-to-end process.
      </PanelIntro>
      <BuyerSellerFlow />
    </div>,

    <div key="create">
      <PanelIntro>
        Panameer experts create and share solutions with every member of the
        community — buyers, other sellers, and new learners.
      </PanelIntro>
      <SellerHub />
    </div>,

    <div key="settle">
      <PanelIntro>
        Panameer runs the settlement end-to-end: one clean payment, flexible
        terms, and none of the employment risk.
      </PanelIntro>
      <CardGrid cards={SETTLE_CARDS} />
    </div>,
  ];

  return (
    <section id="why" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Why Panameer</Eyebrow>
        {/*
          E071's headline finally has a home. It went homeless when Why Panameer
          left `/` two briefs ago; this section is what it was written for.
        */}
        <H2>Together, We Improve Outcomes and Incomes.</H2>
        <Lead>
          Learn, connect, create, and settle — all in one place. Buyers and
          sellers working collectively on one simple, fully integrated platform.
        </Lead>

        <BeatTabs tabs={TABS} panels={panels} />
      </div>
    </section>
  );
}
