import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { BuildLine } from "@/components/status/BuildLine";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getSessionViewer } from "@/lib/session";
import {
  FOLLOWER_COUNT_FLOOR,
  follow as applyFollow,
  followerCount,
  isFollowing,
} from "@/lib/work-tracker/followers";
import { FollowButton } from "@/components/status/FollowButton";

/**
 * `/status` — the public Panameer Work Tracker (`P2-ALL-E753` route, `E757` UI).
 *
 * ⚠⚠ **BUILT TO MOCKUP v5, "the Build Line".** Copy is the mockup's, verbatim,
 * except where data replaces example figures — which is the brief's instruction
 * and the reason none of the numbers below are written in the markup.
 *
 * ⚠⚠⚠ **EVERY FIGURE COMES FROM `getPublicTracker()` AND NOTHING ELSE.** That
 * module's types have nowhere to put task text, task ids, criterion text, notes
 * or owners, which is what keeps Scott's *"no cookbook for the competition"*
 * rule enforced by the TYPE rather than by this template. The leak test asserts
 * it against this page's rendered HTML, not just the API.
 *
 * ⚠ Reached two ways: by path on any host, and by a rewrite from
 * `status.panameer.com/` (`src/proxy.ts`). ⚠⚠ `revalidate = 60` — the tracker
 * changes a few times a day and strangers reload it daily.
 *
 * ⚠ **A DELIBERATE LIGHT DESIGN WITH INK BANDS.** Tokens throughout so dark mode
 * reads; `bg-surface`, never `bg-white` (`E723`).
 */
export const revalidate = 60;

/*
  ⚠⚠ THE SHARE PREVIEW IS COPY TOO (`P2-ALL-E764`). Scott: *"This page does not
  sell … it just provides status for Panameer (no 'your app', etc.)."* ⚠ The
  description is what a link preview and a search result show, so leaving the
  sales voice here would have survived every change on the page itself.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   description: "Watch your platform get built — Panameer, in the open.",
*/
export const metadata = {
  title: "Panameer Work Tracker",
  description: "Daily progress on the Panameer build, from first idea to public beta.",
};

/**
 * ⚠⚠⚠ THE TYPEFACE ON `/status` IS MONTSERRAT 800, NOT COMFORTAA (Scott,
 * walking the page 2026-10-02: *"headings and numerals in Montserrat 800, tight
 * tracking, as in the mockup. No Comfortaa anywhere on /status."*).
 *
 * ⚠⚠ **`font-display` IS COMFORTAA AND CAPS AT 700** (`globals.css` loads
 * 500/600/700), and `@layer base` puts it on every `h1`–`h3` — so a heading here
 * inherited it without asking. ⚠ `font-body` is Montserrat, which IS loaded at
 * 800, and a utility beats `@layer base`.
 * ⚠ `HEAD` is the one definition of that pairing; every heading and every numeral
 * on this page uses it, so they cannot drift apart (`E585`).
 */
const HEAD = "font-body font-extrabold tracking-[-0.03em]";

const STAGE_WORD: Record<string, string> = {
  design: "Designing",
  build: "Building",
  test: "Testing now",
  live: "Live",
};

/** ⚠ The four segments. A `null` stage fills none — an honest "not started". */
const STAGE_INDEX: Record<string, number> = { design: 1, build: 2, test: 3, live: 4 };

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ follow?: string }>;
}) {
  const t = await getPublicTracker();
  /* ⚠⚠ THE PAGE STAYS PUBLIC — reading the session is what lets the button know
     which of its two jobs it has, and a signed-out visitor simply gets the
     sign-up path. Nothing below is gated on it. */
  const viewer = await getSessionViewer();

  /*
    ⚠⚠⚠ `?follow=1` IS WHAT ACTUALLY APPLIES THE SIGN-UP INTENT (`E758`).
    ⚠ The signed-out button sends the person to `/join?next=/status&follow=1`;
    whichever route they take back here, arriving with `follow=1` while signed in
    completes what they asked for. ⚠⚠ It is IDEMPOTENT (`person_id` is unique), so
    a reload, a back button or a replayed link all land on one row — which is the
    property that makes a side effect on a GET acceptable here.
    ⚠ A signed-OUT arrival with `follow=1` does nothing and shows the button, so
    the link cannot be used to make anybody follow anything.
  */
  const { follow: followIntent } = await searchParams;
  if (viewer && followIntent === "1") {
    await applyFollow(viewer);
    /*
      ⚠⚠⚠ AND THEN DROP THE PARAM, WHICH IS NOT TIDINESS — IT IS A BUG FIX.
      ⚠ Measured: with `?follow=1` still in the URL, the Unfollow button's
      `router.refresh()` re-rendered this page, the intent fired again, and the
      person was RE-FOLLOWED. Unfollowing was impossible while the param was
      there. ⚠⚠ A redirect to the clean URL also stops `/status?follow=1` being
      pasted into a chat where every signed-in reader quietly follows.
    */
    redirect("/status");
  }

  const [following, followers] = await Promise.all([isFollowing(viewer), followerCount()]);
  const current = t.phases.find((p) => p.current) ?? null;
  const currentIndex = t.phases.findIndex((p) => p.current) + 1;
  const gatesPassed = t.gates.filter((g) => g.passed).length;
  const updated = new Date(t.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="bg-surface">
      <MarketingHeader />

      {/* ── HERO (ink band) ─────────────────────────────────────────────── */}
      {/*
        ── ⚠⚠⚠ THE BANDS ARE PINNED DARK IN BOTH SCHEMES (Scott, 2026-10-02) ────

        ⚠ **MEASURED AND REPORTED FIRST:** with `bg-ink text-surface` the bands
        INVERTED in dark mode — the hero became the LIGHT part of the page and the
        body the dark part. It read, but it was the opposite of the design intent,
        and Scott ruled them pinned.

        ⚠⚠ **`bg-rail` IS THE PINNED TOKEN AND THE SWITCH IS FREE IN LIGHT.**
        `--color-rail` is `#272334`, defined ONCE outside the dark block, so it
        does not invert — and the LIGHT `--color-ink` is `#272334` too, so this is
        byte-identical in light mode and changes only dark.
        ⚠ `text-white` likewise: only `.bg-white` carries a dark override in
        `globals.css`, never `.text-white`.
        ⚠⚠ Contrast on the pinned band: white **15.26:1**; the magenta accent
        **3.79:1**, which is used only on the two large headings (3:1 floor).
        ⚠ SUPERSEDED, quoted not deleted (`E164`): `bg-ink … text-surface`.
      */}
      <section className="bg-rail px-5 py-12 text-white sm:px-8">
      {/*
        ── ⚠⚠ TWO COLUMNS AT ≥900px (Scott, walking the page 2026-10-02) ────────
        ⚠ Copy left, the overall figure right-aligned at the mockup's scale.
        ⚠⚠ `min-[900px]:` and not `lg:` — he named 900, and Tailwind's `lg` is
        1024, so the named breakpoint is written literally rather than rounded to
        the nearest token. ⚠ Below it the two stack, copy first.
      */}
      <div className="mx-auto grid max-w-[1040px] gap-x-10 gap-y-8 min-[900px]:grid-cols-[1fr_auto] min-[900px]:items-end">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
            {/* ⚠⚠⚠ "Day N" IS DROPPED UNTIL DEFINE HAS A START DATE (Scott,
                2026-10-02: *"no NaN, no invented date"*). The clause disappears;
                nothing stands in for it. */}
            Work Tracker · Building in the open
            {t.dayNumber !== null && <> · Day {t.dayNumber}</>}
          </p>
          {/*
            ⚠⚠⚠ "PANAMEER", NOT "YOUR PLATFORM" (`P2-ALL-E764`, Scott 2026-10-02).
            ⚠ The page reports on ONE build — ours. *"Your platform"* addressed a
            buyer who is not the reader here, and it is the whole reason the close
            band went too. ⚠ The exclamation mark is his.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   Watch your platform <em>get built.</em>
          */}
          <h1 className={`mt-2 text-[34px] leading-[1.02] sm:text-[52px] ${HEAD}`}>
            Watch Panameer <em className="not-italic text-magenta">get built!</em>
          </h1>
          {/*
            ⚠ REPLACED WHOLESALE (`E764`). The old lede sold the tracker as a
            product buyers and providers would use on *their* projects — two
            sentences of pitch on a page whose job is to report.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   This is the Panameer Work Tracker, the same tracker buyers and
            //   providers will use on their own projects. Here it follows ours,
            //   every day, from first idea to public beta.
          */}
          <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-white/80">
            Daily progress on the Panameer build, from first idea to public beta.
          </p>

          <p className="mt-7 flex flex-wrap items-center gap-4">
            <FollowButton signedIn={viewer !== null} initiallyFollowing={following} testId="follow-hero" />
            {/* ⚠⚠ THE COUNT IS HIDDEN BELOW 25 (the brief), not shown small. "3
                people following" makes a young page look emptier than silence. */}
            {followers >= FOLLOWER_COUNT_FLOOR && (
              <span className="text-[14px] text-white/75">
                {followers} people following the build
              </span>
            )}
          </p>
        </div>

        {/*
          ── ⚠⚠⚠ THE FIGURE, AT THE MOCKUP'S SCALE ───────────────────────────
          ⚠ ~184px, right-aligned, with the `%` as a MAGENTA SUPERSCRIPT — it is
          the one number this page exists to show, and at body scale it read as a
          statistic rather than the headline.
          ⚠⚠ `tabular-nums` so 9% and 11% occupy the same width and the column
          does not shift as the build progresses.
        */}
        <div className="min-[900px]:text-right">
          <p className={`flex items-start justify-start leading-[0.82] min-[900px]:justify-end ${HEAD}`}>
            <span className="text-[112px] tabular-nums sm:text-[184px]">
              {/* ⚠ A real zero renders as 0; an uncountable figure renders a dash
                  WITH its reason. The two must not look the same. */}
              {t.overallPercent === null ? "—" : t.overallPercent}
            </span>
            {t.overallPercent !== null && (
              <span className="mt-[0.22em] text-[40px] text-magenta sm:text-[64px]">%</span>
            )}
          </p>
          <p className="mt-1 text-[14px] text-white/75">
            {t.overallPercent === null ? "nothing countable yet" : "of the plan complete"} · updated{" "}
            {updated}
          </p>
          {/*
            ⚠⚠⚠ `moving` IS EVERY TASK IN PROGRESS, NOT THE CURRENT PHASE'S STAGES.
            ⚠ Scott: *"it shows 1; it must be every task with status In Progress
            (27 today)."* The old expression counted ROLLUPS. The query now lives
            in `public-view.ts` beside `doneCount`, which has always counted tasks
            — the two were not even counting the same kind of thing.
          */}
          <p className="mt-1 text-[14px] text-white/75">
            {t.doneCount} done · {t.movingCount} moving · {gatesPassed} of {t.gates.length} gates
          </p>
        </div>
      </div>
      </section>

      <div className="mx-auto max-w-[1040px] px-5 sm:px-8">
        <BuildLine phases={t.phases} milestones={t.milestones} now={Date.parse(t.generatedAt)} />

        {/* ── CURRENT PHASE ───────────────────────────────────────────── */}
        {current && (
          <section className="mt-12 border-t border-line pt-6">
            <p className="font-mono text-[13px] text-ink-2">
              {String(currentIndex).padStart(2, "0")}/{String(t.phases.length).padStart(2, "0")}
            </p>
            <h2 className={`mt-1 text-[24px] text-ink ${HEAD}`}>
              {current.name}
            </h2>
            <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">{current.purpose}</p>

            <ul className="mt-5 border-t border-line">
              {t.currentPhaseStages.map((s) => (
                <li
                  key={s.name}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3"
                >
                  <span className="text-[15px] text-ink">{s.name}</span>
                  <Segments filled={s.percent === null ? 0 : Math.round((s.percent / 100) * 4)} />
                  <span className="ml-auto text-[13px] text-ink-2">
                    {s.percent === null ? "— not countable" : `${s.percent}%`} · {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── JOURNEYS ────────────────────────────────────────────────── */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            Ten parts of one platform.
          </h2>

          {/*
            ── ⚠⚠⚠ THE MOCKUP'S GRID: 5 ACROSS, 2 ON PHONE (Scott, 2026-10-02) ──
            ⚠ It was a stacked list of ten rows, which is not what v5 shows.
            ⚠⚠ **COLUMNS, NOT CARDS** (`phase_3_ui.md` rule 4): the cells divide
            with `border-t` and a thin `border-r` on all but the last in a row, so
            nothing grows a box. ⚠ The 2-up rules are reset before the 5-up ones
            are stated, or a cell carries both a 2-up and a 5-up edge.
          */}
          <ul className="mt-5 grid grid-cols-2 border-t border-line min-[1000px]:grid-cols-5">
            {t.journeys.map((j, i) => (
              <li
                key={j.name}
                className="border-b border-line px-3 py-4 [&:nth-child(2n)]:border-r-0 [&:not(:nth-child(2n))]:border-r [&:not(:nth-child(2n))]:border-line min-[1000px]:border-r min-[1000px]:[&:not(:nth-child(2n))]:border-r min-[1000px]:[&:nth-child(2n)]:border-r min-[1000px]:[&:nth-child(5n)]:border-r-0"
              >
                <span className="font-mono text-[11px] text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`mt-1 block text-[16px] text-ink ${HEAD}`}>{j.name}</span>
                <span className="mt-1 block min-h-[2.6em] text-[13px] leading-snug text-ink-2">
                  {j.description}
                </span>

                <span className="mt-3 block">
                  <Segments filled={j.stage ? STAGE_INDEX[j.stage] : 0} testing={j.stage === "test"} />
                </span>

                <span className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                  {/*
                    ⚠⚠ THE BLINKING DOT IS ONLY ON `test` — the mockup's "Testing
                    now". ⚠ `motion-safe:` only, so reduced motion gets the dot
                    without the blink rather than losing the signal entirely.
                  */}
                  {j.stage === "test" && (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-magenta motion-safe:animate-pulse"
                    />
                  )}
                  {j.stage ? STAGE_WORD[j.stage] : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── MILESTONES ──────────────────────────────────────────────── */}
        {t.milestones.length > 0 && (
          <section className="mt-12 border-t border-line pt-6">
            <h2 className={`text-[24px] text-ink ${HEAD}`}>Milestones</h2>
            <ul className="mt-5 border-t border-line">
              {t.milestones.map((m) => (
                <li key={`${m.title}-${m.date}`} className="flex flex-wrap items-baseline gap-x-4 border-b border-line py-3">
                  <span className="font-mono text-[13px] text-ink-2">{m.date}</span>
                  <span className="text-[15px] font-bold text-ink">{m.title}</span>
                  {m.description && <span className="text-[13.5px] text-ink-2">{m.description}</span>}
                  <span className="ml-auto text-[13px] text-ink-2">{m.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SHIPPED ─────────────────────────────────────────────────── */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            What changed, day by day.
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Every entry is live on app.panameer.com. Written in plain language from the day&apos;s work.
          </p>
          {t.shipped.length === 0 ? (
            <p className="mt-5 text-[14px] text-ink-2">Nothing published yet.</p>
          ) : (
            <ul className="mt-5 border-l-2 border-magenta pl-4">
              {t.shipped.map((s, i) => (
                <li key={`${s.date}-${i}`} className="pb-4">
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">{s.date}</span>
                  <span className="mt-0.5 block text-[15px] font-bold text-ink">{s.title}</span>
                  {s.body && <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-2">{s.body}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── SUPPORT ─────────────────────────────────────────────────── */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            Found a problem? Tell us.
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Issues from testers and users, and how fast they close. What you write in a ticket stays
            private.
          </p>
          {/* ⚠⚠⚠ TWO NUMBERS ONLY (Scott, final): Open and Resolved this week.
              Median first reply is DROPPED — nothing records a first reply, and a
              dash with a reason is still a row on a page meant to be scanned in
              seconds. Both of these are measured counts and render in ink. */}
          <p className="mt-4 text-[15px] text-ink-2">
            <span className={`text-[30px] text-ink ${HEAD}`}>{t.support.open}</span> open
            <span className="mx-3 text-ink-3">·</span>
            <span className={`text-[30px] text-ink ${HEAD}`}>
              {t.support.resolvedThisWeek}
            </span>{" "}
            resolved this week
          </p>
          <p className="mt-4 flex flex-wrap gap-3">
            <Link href="/support" className={SQUARE_DARK}>
              Report an Issue
            </Link>
            <Link href="/support/tickets" className={SQUARE_LIGHT}>
              See Your Tickets
            </Link>
          </p>
        </section>
      </div>

      {/*
        ── ⚠⚠⚠ THE CLOSE BAND IS GONE, AND A PLAIN FOOTER TAKES ITS PLACE (`E764`)

        ⚠ **SCOTT, 2026-10-02:** *"This page does not sell … it just provides
        status for Panameer (no 'your app', etc.) — so [the 'Build it once' band]
        makes no sense."*
        ⚠⚠ **IT IS REMOVED, NOT HIDDEN.** The band carried a pitch, a lede about
        packaging service products, and a `Join the beta` button — a sales close on
        a page whose job is to report. ⚠ `Follow the Build` stays, in the hero
        only, because following a build is not a purchase.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — what stood here:
        //   <section className="mt-14 bg-rail px-5 py-12 text-white sm:px-8">
        //     <h2>Build it once… / sell it for years.</h2>
        //     <p>Package the reports, integrations, dashboards and agents you
        //        have already built, and offer them to new Oracle clients as
        //        service products. Showcased free during the beta.</p>
        //     <Link href="/join">Join the Beta</Link>
        //     <FollowButton … testId="follow-close" />
        //   </section>

        ⚠⚠ **A MINIMAL FOOTER, NOT `MarketingFooter`** (Scott's option (a)): that
        component carries a sales CTA, which is the thing this change removes.
        ⚠ `Report an issue` is a LINK to the existing support form, not a button —
        it is the one thing a reader of a status page may actually need to do.
      */}
      <footer className="mt-16 border-t border-line px-5 py-7 sm:px-8">
        <p className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
          <span>© {new Date(t.generatedAt).getFullYear()} Panameer Inc</span>
          <span aria-hidden className="text-ink-3">·</span>
          {/* ⚠ The marketing root, not `app.` — a public page points at the public
              front door. */}
          <a href="https://panameer.com" className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            panameer.com
          </a>
          <span aria-hidden className="text-ink-3">·</span>
          <Link href="/support" className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            Report an issue
          </Link>
        </p>
      </footer>
    </div>
  );
}

const SQUARE_DARK =
  "inline-flex min-h-[44px] items-center rounded-[4px] bg-ink px-5 text-[14px] font-bold text-surface transition-opacity hover:opacity-85";
const SQUARE_LIGHT =
  "inline-flex min-h-[44px] items-center rounded-[4px] border border-ink bg-surface px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5";

/**
 * ⚠ FOUR SEGMENTS. `filled` is how many are ink; the one after them is magenta
 * when work is moving. ⚠⚠ `filled = 0` draws four empty segments, which is what
 * a `null` journey stage must look like — present, and honestly empty.
 */
function Segments({ filled, testing = false }: { filled: number; testing?: boolean }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            "h-1.5 w-7 rounded-full " +
            (i < filled ? "bg-ink" : i === filled && testing ? "bg-magenta motion-safe:animate-pulse" : "bg-line")
          }
        />
      ))}
    </span>
  );
}
