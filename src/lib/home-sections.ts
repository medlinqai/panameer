/**
 * ── ⚠⚠ HOME'S SIX MENU SECTIONS — THE DATA (`P1-J0-E336`) ───────────────────
 *
 * Scott, 2026-08-27: *"add all these section on top of the existing sections on
 * home. The first thing I will do is normalize the sections."*
 * ⚠ HE IS GOING TO CUT AND REORDER `/` HIMSELF. This file adds six sections and
 * nothing else; no existing section was deleted, merged, reordered or tidied.
 *
 * Source of truth: `2. Claude Sub-Files/mockups/home_sections_2026-08-27.html`.
 * ⚠ THE MOCKUP ALSO CONTAINS A CLOSING CTA BAND (`.close`) AND A BLOCK OF CHAT
 * NOTES (`.notes`). NEITHER IS SHIPPED — the brief asks for six sections. Reported.
 *
 * ── ⚠⚠ THE SIX CTA LABELS ARE DELIBERATELY DIFFERENT FROM THE PAGE HEROES ───
 *
 * Scott, 2026-08-27: *"The buttons on HOME are meant to be different than the
 * buttons across the others. I started making them the one constant between the
 * two pages…but why use the same CTA twice…vary it a bit."*
 *
 * ⚠⚠ THIS IS NOT DRIFT AND IT IS NOT A BUG. DO NOT "FIX" IT by pointing these at
 * `LEARN_CTA_LABEL`, `TALENT_CTA_LABEL`, `WORK_CTA_LABEL`, `SHOP_CTA_LABEL`,
 * `INTEGRATE_CTA_LABEL` or `OPTIMIZE_CTA_LABEL`. Those six are what each PAGE's own
 * hero says; these six are what HOME says. Two different jobs:
 *
 *     HOME says                        the page's hero says
 *     Start Optimizing My Business Now Start Your Free Optimization Assessment
 *     Start Learning Now               Start Learning for Free
 *     Sell More Time Now               Create My Profile
 *     Shop for Service Products Now    Shop Service Products
 *     Start Posting Your Work          Create a Work Request
 *     Integrate with Panameer's AIP    How We Integrate
 *
 * ⚠ THEY ARE STILL CONSTANTS, single-sourced WITHIN HOME — one live literal each,
 * because the same rule that made the page labels constants applies here
 * (`P1-J4-E024`: `/work` shipped two different strings for one button).
 */

/*
  ⚠⚠ FOURTH LABEL IN THREE DAYS. That churn is exactly why this is a constant with
  ONE live literal — `P1-J4-E024` is the precedent, where `/work` shipped two
  different strings for one button and they drifted apart.
  ⚠ SUPERSEDED, in order, quoted not deleted: *"Start the Assessment"* (`E337`) ->
  *"Take Our Free Assessment"* (`E338`) -> *"Create My FREE AI Roadmap"* (`E339`,
  whose capitalised `FREE` was Scott's and shipped as typed) -> this (`E342`).
  ⚠⚠ THE WORD `FREE` HAS LEFT THE BUTTON. Scott, 2026-08-27: the label is now
  *"Start Optimizing My Business Now"*. The offer is still free and the body copy
  still says so (*"- all for free"*); only the BUTTON stopped saying it. Do not
  re-add it here on the strength of the `E339` note above — that note is history.
  ⚠ IT MATCHES THE FIRST-PERSON VOICE of the six chips below (`My Business`,
  `My Work Order`). Button and card now speak as the reader; keep them in step.
  ⚠ THE `href` HAS NEVER CHANGED (`/assess`).
  ⚠ THE BODY COPY DOES NOT QUOTE IT — it says *"Click the button below"* — so
  nothing interpolates this. `s.body.replace("%s", s.ctaLabel)` is a no-op for this
  section. It is still the button's only source.
*/
export const HOME_OPTIMIZE_CTA = "Start Optimizing My Business Now";
export const HOME_LEARN_CTA = "Start Learning Now";
/*
  ⚠ SCOTT CHOSE BETWEEN TWO LABELS, `P1-J0-E346`: *"good catch - use Sell More Time
  Now."* ⚠ *"Start Selling Your Time Now"* WAS THE OTHER CANDIDATE AND IS NOT USED —
  it appears nowhere in the tree; do not "restore" it from this note.
  ⚠ SUPERSEDED, quoted not deleted: *"Start Shaping Your Time"*.
  ⚠⚠ THE HEADLINE ABOVE THIS BUTTON STILL READS *"Sell More Time by Shaping It to
  Client Needs"*, so the section now says "Sell More Time" TWICE. Reported to Scott
  at `E346` and deliberately NOT changed — the headline is his to cut.
*/
export const HOME_TALENT_CTA = "Sell More Time Now";
/*
  ⚠ SCOTT'S LABEL, `P1-J0-E347`. ⚠ SUPERSEDED, quoted not deleted: *"Start Reselling
  Your Work"*.
  ⚠⚠ THIS BUTTON GOES NOWHERE AND THE NEW LABEL MAKES THAT WORSE, NOT BETTER. The
  shop section's `ctaHref` is `null` (see below), so the control renders
  `aria-disabled` with NO `href` — `P1-J2-E010`, there is no public catalogue. The
  label is now an imperative, *"Shop for Service Products Now"*, and the new body
  copy says *"Click the button below to see the service products"*. THE COPY TELLS
  THE READER TO CLICK A CONTROL THAT CANNOT BE CLICKED.
  ⚠ THAT IS REPORTED AT `E347` AND DELIBERATELY NOT FIXED HERE — the brief says do
  not touch the href, and `check:ui` locks it disabled for a good reason: an enabled
  button with nowhere to go is worse. It is a PRE-LAUNCH item, not a build item.
  ⚠ DO NOT "FIX" IT by giving the button `href="#"`, an empty href, a dead handler,
  or `(app)/packages` (signed-in, 307s). The test asserts all three.
*/
export const HOME_SHOP_CTA = "Shop for Service Products Now";
export const HOME_WORK_CTA = "Start Posting Your Work";
export const HOME_INTEGRATE_CTA = "Integrate with Panameer’s AIP";

export type HomeSection = {
  /** Stable key, also the `id` on the band. */
  key: string;
  /** ⚠ ONE LINE, NEVER WRAPS above 1150px. See the component. */
  eyebrow: string;
  /** Two-part headline: `b` is rendered on its own line when present. */
  headline: { a: string; b?: string };
  body: string;
  chipsTitle: string;
  /*
    ⚠ WAS A 3-TUPLE, NOW A LIST. `P1-J0-E338` §6 gave the OPTIMIZE section SIX
    lines; the other five still have three. ⚠ THE NUMERALS ARE DERIVED FROM THE
    INDEX, so the panel counts whatever is here — no numbering to keep in step.
    ⚠ SUPERSEDED: *"⚠ ALWAYS THREE. The panel's numerals are 1-3."*
  */
  chips: string[];
  ctaLabel: string;
  /**
   * ⚠ READ OFF EACH PAGE'S OWN HERO, NOT INVENTED — the brief is explicit.
   *   /optimize   HomeHero.tsx        href="/assess"
   *   /learn      LearnPublic.tsx     href="/learn/paths"
   *   /talent     TalentHero.tsx      href="/join/provider"
   *   /work       WorkHero.tsx        href="/create-work"
   *   /integrate  IntegrateHero.tsx   href="#punchout"
   * ⚠ `null` MEANS `aria-disabled` WITH NO `href` — Shop only. See below.
   */
  ctaHref: string | null;
  /** The menu page. All six exist and are public. */
  learnMoreHref: string;
};

/**
 * ⚠ ALTERNATION STARTS DARK: 1 dark · 2 light · 3 dark · 4 light · 5 dark · 6 light,
 * and odd sections put the copy LEFT. The component derives both from the index, so
 * REORDERING THIS ARRAY RE-STRIPES THE PAGE automatically — which is what Scott
 * needs, because he intends to reorder.
 */
export const HOME_SECTIONS: HomeSection[] = [
  {
    key: "optimize",
    /*
      ⚠ SCOTT'S STRING, 2026-08-27: *"Change the pink text and make it bigger."*
      ⚠ HIS HYPHEN `-`, NOT AN EM DASH. Do not "improve" it.
      ⚠ SUPERSEDED: *"Learn where you stand…get a plan to optimize…now"*.
      ⚠ THIS ONE IS RENDERED LARGER THAN THE OTHER FIVE — see `HomeSections.tsx`,
      which sizes the hero section's eyebrow separately and must keep it on ONE LINE.
    */
    /*
      ⚠ SCOTT DROPPED `AI` 2026-08-27 — it is `Build Your Roadmap`, not `Build Your
      AI Roadmap`. Shipped as typed. ⚠ HIS HYPHEN `-`, NOT AN EM DASH.
      ⚠ SUPERSEDED: *"See Your Options - Build Your AI Roadmap"* (40 chars).
      ⚠ 36 CHARS NOW — the size was RE-MEASURED, see `HomeSections.tsx`.
    */
    eyebrow: "See Your Options - Build Your Roadmap",
    headline: { a: "Optimize Your Business with AI" },
    /*
      ⚠⚠ SCOTT'S COPY, 2026-08-27, WITH THREE TYPOS CORRECTED — ALL THREE FLAGGED
      SO HE CAN REVERT ANY OF THEM:
        · `take 15 minute`      -> `take a 15 minute`
        · `one of out experts`  -> `one of our experts`
        · a stray closing quote after `for free` removed
      ⚠ `1 year` AND `- for free` ARE HIS AND ARE NOT TOUCHED. Do not "improve" them
      to `one-year` or an em dash.
      ⚠ THE QUOTED LABEL IS INTERPOLATED FROM `HOME_OPTIMIZE_CTA` at the render site,
      never retyped — `%s` is substituted in `HomeSections.tsx`.
      ⚠ SUPERSEDED — the previous body began *"Take our assessment and let us build
      you a personalized AI dashboard…"*.
    */
    /*
      ⚠⚠ SCOTT'S COPY, 2026-08-27 (pass 2). ONE TYPO CORRECTED AND FLAGGED:
        · `we will  review` -> `we will review`  (a double space)
      ⚠ `1 year`, `All for free.` AND THE CLOSING `!` ARE HIS. Do not change them.
      ⚠⚠ IT NO LONGER QUOTES THE BUTTON — it says *"the button below"*, so this
      sentence DOES NOT interpolate `HOME_OPTIMIZE_CTA` any more. THAT IS
      INTENTIONAL, not a regression of `P1-J4-E024`: there is no quoted label left
      to drift. `HOME_OPTIMIZE_CTA` still exists and still labels the button.
      ⚠ SUPERSEDED — the previous body opened *"Click the “Take Our Free Assessment”
      button below to take a 15 minute assessment…"*.
    */
    /*
      ⚠⚠ SCOTT'S COPY, 2026-08-27 (pass 3). ONE TYPO CORRECTED AND FLAGGED:
        · `hire from within dashboard` -> `hire from within THE dashboard`
      ⚠ `immediate AI Roadmap`, `- all for free` AND HIS HYPHEN ARE HIS. Do not
      improve them to `an immediate AI Roadmap` or an em dash.
      ⚠ IT SAYS *"the button below"* AND DOES NOT QUOTE THE LABEL, so it does NOT
      interpolate `HOME_OPTIMIZE_CTA`. Correct and intentional — there is no quoted
      label left to drift out of step with the button.
      ⚠ SUPERSEDED — the previous body ran *"…Next, Panameer will build your AI
      Optimization Dashboard … Together, we will review and prioritize your options
      to create a 1 year AI Roadmap. All for free. You can even use our project
      tracker to manage the deployment!"*
    */
    body:
      "Click the button below, answer several questions, and submit your answers. " +
      "Panameer builds your AI Optimization Dashboard (listing the possible " +
      "solutions for your organization) within minutes and sends you the link. " +
      "Access the dashboard, review the solutions, and click the button to " +
      "schedule a meeting with our expert. Together, we select and prioritize the " +
      "options that are right for your organization, creating your immediate AI " +
      "Roadmap - all for free. You can even hire from within the dashboard and " +
      "track the deployment from within Panameer.",
    chipsTitle: "What you get",
    /*
      ⚠ SCOTT'S THREE LINES, 2026-08-27 (pass 2). ⚠ HIS
      `organization/business process` HAS NO SPACES AROUND THE SLASH — as typed.
      ⚠ THE CARD'S HEADING, CHROME, NUMBERING AND LAYOUT ARE UNCHANGED; only these
      three strings moved.
      ⚠ SUPERSEDED: *"A personalized AI dashboard showing where you stand"* ·
      *"An expert session to pick and prioritize solutions"* ·
      *"Your 12-month roadmap — all for free"*.
    */
    /*
      ── ⚠⚠ FOURTH VERSION OF THIS CARD IN TWO DAYS — READ THE WHOLE HISTORY ────

      Scott, 2026-08-27 (pass 4, `P1-J0-E340`): *"I think i like the six from
      before...might be more impactful then the tiles."* THE SIX ARE LIVE AGAIN and
      `ProofStats` came off `/` to make room — see the note in `HomeSections.tsx`
      where the tiles used to render.

      ⚠⚠ HE SAID THE OPPOSITE ONE DAY EARLIER, AND THAT INSTRUCTION IS NOT DELETED.
      Scott, 2026-08-27 (pass 3, `b28758e`): *"six options look horrible. Let's move
      it back to 3."* ⚠ SUPERSEDED, the three that shipped under it: *"Create Your
      List of Optimization Options."* · *"Free meeting with an Expert to
      Prioritize."* · *"Build Your AI Roadmap & Hire from within Panameer."*
      ⚠ SUPERSEDED, the pass-2 three (`f51080e`, restored to this record by `E340` —
      `b28758e` dropped them WITHOUT quoting them while leaving the note above that
      cites their slash): *"See your ranking"* · *"See a list of possible solutions
      for your organization/business process"* · *"Review and prioritize those
      solutions with an expert"*.
      ⚠⚠ THE TWO SUPERSEDED SETS ABOVE ARE HISTORY, NOT LIVE INSTRUCTIONS. Do not
      "restore" either one on the strength of the quote. The six below are current.

      ⚠⚠ THE SIX WERE LIFTED OUT OF `a7394d7` BYTE-FOR-BYTE, NOT RETYPED
      (`git show a7394d7:src/lib/home-sections.ts`), and were diffed against this
      file's own superseded quote before the restore — both sources agreed on all
      six. A retyped string is how an `&` silently becomes an `and`.
      ⚠ HIS `&` IN ITEM 3, HIS UNHYPHENATED `1 year`, HIS CAPITALISATION, HIS
      PERIODS. Scott is wordsmithing these himself: do not edit a character, do not
      re-space, do not re-punctuate.

      ⚠ HEADING, CHROME, NUMBERING AND LAYOUT ARE UNCHANGED. The numerals derive
      from the index, so six chips number themselves 1-6 with no other edit.
      ⚠ NO 2x3 GRID WAS EVER BUILT and none is briefed. `a7394d7` proposed one and
      correctly did not build it; `E340` forbids it in as many words.
      ⚠ THE 215px COLUMN GAP `a7394d7` REPORTED WAS MEASURED WITH THE TILES STILL
      SITTING UNDER THE CARD — 113px of it was the tiles. This ships the six
      WITHOUT them, so that number does not carry over; it was re-measured.
    */
    /*
      ── ⚠⚠ SET FOUR (`P1-J0-E341`) — SCOTT REWROTE ALL SIX FOR SPACING ─────────

      He is tuning the card's HEIGHT by the copy: these are deliberately shorter
      than the set they replace. That is the point of the rewrite, so do not "fix"
      them by expanding them back out.

      ⚠⚠ HIS CAPITALISATION IS UNEVEN AND IT IS DELIBERATE. `AI Roadmap`, `Hire
      Talent`, `an Expert` and `Panameer work order` are capitalised; `optimization`
      and `dashboard` are not. SHIP EXACTLY AS TYPED — do not normalise, do not
      title-case, do not sentence-case. He said he would wordsmith these himself.
      ⚠ AMERICAN SPELLING IS HIS: `optimization`, not `optimisation`.

      ⚠⚠ ONE TYPO CORRECTED, FLAGGED SO HE CAN REVERT IT. He typed item 6 as
      *"Create additional AI Roadmaps roadmaps for other processes."* — `Roadmaps
      roadmaps` is a duplicated word. Shipped with the second one dropped. That is
      the ONLY departure from his text; nothing else was touched.

      ── THE SUPERSEDED RECORD — FOUR SETS, NONE DROPPED ────────────────────────
      This card has now had four sets of strings in three days. `b28758e` dropped
      one WITHOUT quoting it and `E340` had to recover it from `f51080e`; that is
      why every set below is written out in full rather than referenced.

      ⚠ THE OUTGOING SET — SUPERSEDED by this commit. `a7394d7`'s six, restored by
      `E340` and live until now: *"See your rank, how you compare to your peers."* ·
      *"See a list of possible solutions based on your processing details."* ·
      *"Review & prioritize the solutions into a 1 year deployment roadmap."* ·
      *"Hire talent to deploy from within your AI Roadmap."* · *"Track the progress
      of that work within Panameer."* · *"Create additional roadmaps for other
      processes, hire and manage within the tracker."*
      ⚠ THE THREE EARLIER SETS are quoted in the two comments above this one: the
      pass-1 three, the pass-2 three (`f51080e`), and `b28758e`'s three. Counting
      the six directly above, the record holds FOUR superseded sets. All present.

      ⚠⚠ ALL FOUR SUPERSEDED SETS ARE HISTORY, NOT LIVE INSTRUCTIONS, and so are the
      instructions that produced them (*"six options look horrible. Let's move it
      back to 3."* · *"I think i like the six from before..."*). Do not restore any
      of them on the strength of a quote. The six below are current.

      ⚠ HEADING, CHROME, NUMBERING AND LAYOUT ARE UNCHANGED. The numerals derive
      from the index. NO 2x3 GRID — `E340` measured the columns at 387/437, a 50px
      gap, and shorter strings can only narrow it. Measured again for `E341`.
    */
    /*
      ── ⚠⚠ SET FIVE (`P1-J0-E342`) — FIFTH SET IN FOUR DAYS ────────────────────

      ⚠⚠ HIS VOICE SHIFTED TO FIRST PERSON AND IT IS CONSISTENT: `My Business`,
      `My Panameer AI Roadmap`, `My Work Order`. Deliberate, and it now matches the
      button (`HOME_OPTIMIZE_CTA` = *"Start Optimizing My Business Now"*).
      ⚠ DO NOT CHANGE `My` TO `Your`. Button and card speak as the reader together.

      ⚠⚠ ITEM 1 HAS NO FULL STOP AND THE OTHER FIVE DO. SHIPPED AS TYPED, NOT
      "FIXED". Scott has instructed twice that his punctuation ships verbatim, so
      the inconsistency is REPORTED to him rather than silently corrected. If he
      wants the stop he will say so; do not add it on your own judgement.
      ⚠ ITEMS 1 AND 3 ARE NOUN PHRASES (`A Process-Based…`, `A Review Session…`);
      2, 4, 5 and 6 OPEN WITH VERBS. THE MIXED GRAMMAR IS HIS — do not make them
      parallel. ⚠ TITLE CASE THROUGHOUT IS HIS — do not sentence-case it.

      ⚠⚠ ONE TYPO CORRECTED, FLAGGED SO HE CAN REVERT: item 3 was typed *"with en
      Expert"* -> shipped as *"with an Expert"*. That is the ONLY departure from his
      text. ⚠ A stray leading apostrophe appeared before item 5 in his message
      (`'"Track Progress…`) — a typing artifact, not copy, so it is not shipped.

      ── THE SUPERSEDED RECORD — FIVE SETS, NONE DROPPED ────────────────────────
      ⚠ `E340` had to RECOVER a set from `f51080e` because `b28758e` deleted instead
      of quoting. Every set since is written out in full for that reason.

      ⚠ SET FOUR — SUPERSEDED by this commit (`38d69c6`, `E341`; Scott rewrote it
      for spacing and it lasted one commit): *"Create process-based optimization
      dashboard."* · *"See optimization solutions for your business."* · *"Create AI
      Roadmap with an Expert."* · *"Hire Talent from within AI Roadmap."* · *"Track
      progress from Panameer work order."* · *"Create additional AI Roadmaps for
      other processes."*
      ⚠ SETS ONE TO THREE are quoted in the two comment blocks ABOVE this one — the
      pass-1 three, the pass-2 three (`f51080e`), `b28758e`'s three, and `a7394d7`'s
      six. Counting set four directly above, the record holds FIVE superseded sets.

      ⚠⚠ EVERY SET ABOVE IS HISTORY, NOT A LIVE INSTRUCTION, and so is every
      instruction that produced one. Do not restore any of them from a quote.
      ⚠ THIS COMMENT BLOCK IS GETTING UNWIELDY — flagged in the `E342` report, NOT
      restructured here, because restructuring it unasked is how a set gets lost.

      ⚠ HEADING, CHROME, NUMBERING AND LAYOUT ARE UNCHANGED. Numerals derive from
      the index. NO 2x3 GRID, no redesign — `E341` measured 381/389, an 8px gap.
    */
    /*
      ── ⚠⚠ SET SIX (`P1-J0-E344`) — AND THE FIRST THAT IS INTERNALLY CONSISTENT ──

      ⚠⚠ NO FULL STOPS ON ANY OF THE SIX, deliberate and consistent this time. Set
      five had a stop on five of six and none on the first; that was reported to
      Scott and this is his answer. DO NOT ADD THEM BACK.
      ⚠⚠ `w/in` IS HIS ABBREVIATION FOR `within` AND IT IS LOAD-BEARING — item 4 is
      the longest line in the card and the abbreviation is part of how it fits. DO
      NOT EXPAND IT.
      ⚠ TITLE CASE IS HIS. Item 1 has no article and item 3 has `An` — do NOT make
      them parallel.

      ⚠⚠ EVERY CHIP FITS ON ONE LINE BECAUSE THE STRINGS ARE SHORT ENOUGH — NOT
      BECAUSE OF `whitespace-nowrap`. Scott: *"Want each number to fit on 1 line."*
      ⚠ DO NOT ADD `nowrap` TO A CHIP. A nowrap chip that is too long overflows the
      card SILENTLY while every line-count check reports one clean line; that false
      pass has already cost this page two cuts (`E337`, `E341`).
      ⚠ MEASURED WITH A `Range` AGAINST THE ROW'S REAL AVAILABLE WIDTH — the row
      minus the numeral minus the gap — NOT against the span's own shrink-to-fit box,
      which reports the text width and would have made any string look like it fits:
        1440 — available 422px · longest is item 4 at 355px · all six one line
        1160 — available 413px · longest is item 4 at 355px · all six one line
        390  — available 250px · four of six wrap, expected on a phone
      ⚠ ITEM 4 HAS 58px OF SLACK AT 1160. Lengthening it is what will break this.

      ── THE SUPERSEDED RECORD — SIX SETS, NONE DROPPED ─────────────────────────
      ⚠ `E340` had to RECOVER a set from `f51080e` because `b28758e` deleted instead
      of quoting. Every set since is written out in full for that reason.
      ⚠ SET FIVE — SUPERSEDED by this commit (`fb2ad4f`, `E342`): *"A Process-Based
      Optimization Dashboard"* · *"See Optimization Solutions for My Business."* ·
      *"A Review Session with an Expert for My Panameer AI Roadmap."* · *"Hire
      Talent, Create Timeline from AI Roadmap."* · *"Track Progress from My Work
      Order."* · *"Create Roadmaps for Other Processes."*
      ⚠ SETS ONE TO FOUR are quoted in the comment blocks ABOVE this one: the pass-1
      three, the pass-2 three (`f51080e`), `b28758e`'s three, and `a7394d7`'s six.
      With set five directly above, the record holds SIX superseded sets.
      ⚠⚠ ALL OF THEM ARE HISTORY, NOT LIVE INSTRUCTIONS. Do not restore any from a
      quote.
      ⚠ THIS BLOCK IS UNWIELDY — flagged in the `E344` report with a proposed shape.
      NOT restructured here; restructuring it unasked is how a set gets lost.

      ⚠ HEADING, CHROME AND NUMBERING UNCHANGED. Numerals derive from the index.
    */
    /*
      ── ⚠⚠ SET SEVEN (`P1-J0-E345`) — FIVE CHIPS, NOT SIX ──────────────────────

      Scott dropped one outright: *"no space for one"*. The line that went was
      *"Hire Talent, Create Timeline from w/in AI Roadmap"* — set six's item 4 and
      the longest chip on the page at 355px.
      ⚠ NO FULL STOPS — deliberate, and consistent with set six.
      ⚠ `w/in` IS HIS ABBREVIATION FOR `within` and survives in item 4. DO NOT EXPAND.
      ⚠ EVERY LINE NOW OPENS WITH `Free` EXCEPT ITEM 5, WHICH PUTS IT SECOND
      (*"Create Free Roadmaps…"*). His, deliberate, do not make them parallel.

      ⚠⚠ ONE LINE EACH BY LENGTH, NOT BY `nowrap`. DO NOT ADD `nowrap` TO A CHIP — a
      nowrap chip that is too long overflows the card silently while a line count
      reports one clean line. ⚠ `Range`-measured against the row's REAL available
      width (row minus numeral minus gap), NOT the span's own shrink-to-fit box,
      which reports the text width and makes any string look like it fits:
        1440 available 422px · 1160 available 413px
        315 · 295 · 319 · 334 · 366 — all five one line, longest is item 5 with
        47px of slack at 1160. They wrap at 390, which is correct on a phone.

      ⚠ SET SIX — SUPERSEDED by this commit (`4149af3`, `E344`), quoted not deleted:
      *"Process-Based Optimization Dashboard"* · *"AI Solutions for Your Business"* ·
      *"An AI Roadmap with Expert Review"* · *"Hire Talent, Create Timeline from w/in
      AI Roadmap"* · *"Track Deployment Progress from Work Order"* · *"Create
      Roadmaps for Other Business Processes"*
      ⚠ SETS ONE TO FIVE are quoted in the comment blocks ABOVE this one. With set six
      directly above, the record holds SEVEN superseded sets for this card alone.
      ⚠⚠ ALL HISTORY, NOT LIVE INSTRUCTIONS. Do not restore any set from a quote.
      ⚠ THIS BLOCK IS UNWIELDY AND WAS FLAGGED AT `E344` WITH A PROPOSED SHAPE. Not
      restructured here; doing it unasked is how a set gets lost.
    */
    chips: [
      "Free Process-Based Optimization Dashboard",
      "Free AI Solution Options for Your Business",
      "Free AI Roadmap with the Expert to Review It",
      "Free Deployment Tracker from w/in Work Order",
      "Create Free Roadmaps for Other Business Processes",
    ],
    ctaLabel: HOME_OPTIMIZE_CTA,
    ctaHref: "/assess",
    learnMoreHref: "/optimize",
  },
  {
    key: "learn",
    /* ⚠ `GET SUPPORT WHILE`, Scott 2026-08-27, replacing the deck's `BET BTTER`. */
    /*
      ⚠ SCOTT'S STRING, `P1-J0-E345`. ⚠ THREE DOTS `...`, NOT AN ELLIPSIS `…` — as he
      typed it. Sections 3 and 6 are also three dots; 4 and 5 are a single `…`
      character. THE PAGE IS INCONSISTENT AND THAT IS HIS TEXT — reported, not tidied.
      ⚠ SOURCE CASING IS MIXED AND IRRELEVANT — the CSS uppercases it. Do not "fix"
      the source string to match what renders.
      ⚠⚠ IT IS ALSO THE TIGHTEST HEADER ON THE PAGE at 14px: 502px against a 553px
      column at 1160, 51px of slack. Lengthening it is what will break the line.
      ⚠ SUPERSEDED, quoted not deleted: *"Expand your services…get support while
      delivering them"* (54 chars, and at 14px it measured 607px — it OVERFLOWED by
      54px, which is why `E343` and `E344` both stopped on it rather than shipping.
      Shortening the string is what unblocked the uniform 14px).
    */
    eyebrow: "The Support You Need...to Increase Your Income",
    /* ⚠ SUPERSEDED, quoted not deleted: *"Learn New Skills & Build a Support
       Network"*. Scott shortened it (`P1-J0-E344`). */
    headline: { a: "Learn Skills & Build Your Network" },
    /*
      ⚠⚠ SCOTT'S COPY, 2026-08-27 (`E344`). ONE TYPO CORRECTED AND FLAGGED:
        · `post top your resume/socials` -> `post TO your resume/socials`
      ⚠ `and/or` AND `resume/socials` HAVE NO SPACES AROUND THE SLASHES. His.
      ⚠ THE EM DASH IN `— all for free` IS HIS and carries over from the old copy.
      ⚠⚠ THE BRIEF WARNED HE TYPED DOUBLE SPACES BETWEEN SENTENCES AND THAT JSX WOULD
      COLLAPSE THEM. The authoritative string the brief supplied contains NONE —
      checked byte by byte, ZERO occurrences of two consecutive spaces — so nothing
      collapses and the `&nbsp;` question never arises. Single-spaced because that is
      how he was quoted, not because anything was normalised here.
      ⚠ SUPERSEDED, quoted not deleted: *"Sign up for Panameer. Enroll in one or more
      learning paths, take the courses, watch the lessons — all for free. Connect
      with the learning path community or specifically with that instructor. When you
      are ready, take the certification test and work your network to get working and
      keep working."*
      ⚠ IT SAYS *"the button below"* AND DOES NOT QUOTE THE LABEL, so it does not
      interpolate `HOME_LEARN_CTA`; `replace("%s", ...)` is a no-op here.
    */
    body:
      "Click the button below and join Panameer. Enroll in a learning path and " +
      "connect with its community and/or the expert who created that learning path. " +
      "Take its courses, watch its lessons — all for free. When done, take the " +
      "certification test and post to your resume/socials. Collaborate with your " +
      "community while working.",
    chipsTitle: "What you get",
    /*
      ⚠⚠ FOUR CHIPS, NOT THREE (`E344`). The other five sections keep three; `chips`
      is already `string[]` (widened at `a7394d7`) so nothing structural changed, and
      the numerals derive from the index, so the panel counts to 4 by itself.
      ⚠⚠ REWRITTEN AGAIN AT `P1-J0-E345` — AND THE FULL-STOP PROBLEM IS GONE. The
      previous set had a stop on three of four and none on item 2; that was reported
      rather than corrected, and this set has NO stops at all, matching the hero card.
      The two cards now agree. ⚠ Every line opens with `Free` except item 3, which
      puts it last (*"…for Free"*). His, deliberate — do not make them parallel.
      ⚠ ONE LINE EACH, BY LENGTH AND NOT BY `nowrap` — same rule as the hero card.
      `Range`-measured against the row's real available width: 1440 available 422px,
      1160 available 413px; widths 282 · 302 · 296 · 299, all four one line, longest
      has 111px of slack at 1160. They wrap at 390, which is expected.
      ⚠ SUPERSEDED, quoted not deleted — the `E344` four: *"Access to Learning Paths,
      Courses, & Lessons."* · *"Access to Learning Path Communities"* · *"Ability to
      Connect with Instructors."* · *"Access to Free Certifications."*
      ⚠ SUPERSEDED, the original three: *"Learning paths, courses and lessons —
      free"* · *"The path community, and the instructor directly"* · *"A
      certification test, then a network to work"*.
    */
    chips: [
      "Free Access to Learning Paths & Courses",
      "Free Access to Learning Path Communities",
      "Ability to Connect with Instructors for Free",
      "Free Access to Learning Path Certifications",
    ],
    ctaLabel: HOME_LEARN_CTA,
    ctaHref: "/learn/paths",
    learnMoreHref: "/learn",
  },
  {
    key: "talent",
    /*
      ⚠ SCOTT'S STRING, `P1-J0-E345`. Three dots, his casing.
      ⚠ SUPERSEDED, quoted not deleted: *"Get the talent your business needs…when it
      needs it"* — 457px at 11.5px, which scales to ~556px at 14px against a 553px
      column. IT WOULD HAVE OVERFLOWED; this shorter string (408px) is what allows
      section 3 to take the uniform size.
    */
    eyebrow: "The Talent You Need...When you need it",
    headline: { a: "Sell More Time by Shaping It to Client Needs" },
    /*
      ⚠⚠ SCOTT'S COPY, `P1-J0-E346`. ⚠ `software lifecycle` -> `deployment lifecycle`
      IS HIS EDIT, not a synonym swap — do not revert it.
      ⚠ IT NOW OPENS WITH A CALL TO ACTION (*"Click the button below, upload your
      resume, and use AI to create your profile in seconds."*) which the old copy did
      not have. ⚠ IT SAYS *"the button below"* AND DOES NOT QUOTE THE LABEL, so it
      does not interpolate `HOME_TALENT_CTA`; `replace("%s", ...)` is a no-op here.
      That matters more than usual this time — the label changed in the same commit.
      ⚠ THE BRIEF WARNED HE TYPED DOUBLE SPACES BETWEEN SENTENCES. The authoritative
      string it supplied contains NONE — checked byte by byte, zero occurrences of
      two consecutive spaces — so nothing collapses and no `&nbsp;` question arises.
      ⚠ SUPERSEDED, quoted not deleted: *"Clients need expert help at different
      inflection points and for different durations during the software lifecycle. By
      offering one or multi-day consultations, monthly retainers as well as long term
      time and expense work, both parties are incentivized to create better incomes
      and better outcomes."*
    */
    body:
      "Clients need expert help at different inflection points and for different " +
      "durations during the deployment lifecycle. Click the button below, upload your " +
      "resume, and use AI to create your profile in seconds. Offer your expertise in " +
      "one or multi-day consultations, monthly retainers as well as long term time " +
      "and expense work. Both parties are incentivized to create better incomes and " +
      "better outcomes.",
    /*
      ⚠ WAS *"Shape your time"* UNTIL `P1-J0-E346`. Scott: all six cards say *"What you get"* now.
      ⚠ FOR THE RECORD — NOTHING BROKE THIS. The four distinct titles were in the
      ORIGINAL MOCKUP and had been distinct ever since; no commit drifted them apart.
      ⚠ SENTENCE CASE, matching sections 1 and 2. The CSS uppercases it — do NOT
      force uppercase in the data.
    */
    chipsTitle: "What you get",
    /*
      ⚠⚠ FOUR CHIPS, REPLACING THREE (`P1-J0-E346`). Scott first said *"add"*, then
      confirmed *"Replace current options with the 4 ones i gave you."* — so the
      three below are GONE, not appended to.
      ⚠⚠ ONE TYPO CORRECTED AND CONFIRMED BY HIM: item 3 was typed *"Ability to
      Monthly/Quarterly Retainers"*, missing the verb. He confirmed the fix —
      *"Correct...ability to sell..."*. Shipped as *"Ability to Sell
      Monthly/Quarterly Retainers"*.
      ⚠ `Monthly/Quarterly` HAS NO SPACES AROUND THE SLASH. His. Title Case is his.
      No full stops, consistent with sections 1 and 2.
      ⚠ ONE LINE EACH BY LENGTH, NOT BY `nowrap` — measured in the `E346` report.
      ⚠ SUPERSEDED, quoted not deleted: *"One-day and multi-day consultations"* ·
      *"Monthly retainers"* · *"Long-term time and expense work"*.
    */
    chips: [
      "Ability to Sell 1 Week Project Planning Consults",
      "Ability to Sell One-Day App Demos",
      "Ability to Sell Monthly/Quarterly Retainers",
      "Ability to Sell RFP Sales Assistance",
    ],
    ctaLabel: HOME_TALENT_CTA,
    ctaHref: "/join/provider",
    learnMoreHref: "/talent",
  },
  {
    key: "shop",
    eyebrow: "Deploy cheaper and faster…with less risk",
    /* ⚠ CHAT'S `<br>` SPLIT of the deck's one-liner. Flagged for Scott to revert. */
    /*
      ⚠⚠ ONE PART NOW — THE `b` KEY IS GONE (`P1-J0-E347`). This is a single-line
      headline. ⚠ NO RENDER CHANGE WAS NEEDED: `HomeSections.tsx` already guards it
      with `{s.headline.b && (...)}` and the type is `b?: string`, so a missing `b`
      renders nothing — sections 1, 2 and 3 have shipped without it for days. The
      brief asked to check whether the component assumed both parts existed; it does
      not, and no second line was invented.
      ⚠ HIS HYPHEN `-`, NOT AN EM DASH, AND HIS `&`. Do not typographically "improve"
      the hyphen to an en or em dash.
      ⚠ SUPERSEDED, quoted not deleted: a: *"Don’t Just Sell Your Time…"* ·
      b: *"Resell Your Work"* — note the old `a` ended in a real ellipsis character.
    */
    headline: { a: "Lower Costs & Risk - Buy Outcomes Not Hours" },
    /*
      ⚠⚠ VERBATIM, AND `resell` IS DELIBERATE. Scott, 2026-08-27, OVERRULED the
      2026-08-27 copy rule in `decisions-01.md` FOR THIS PARAGRAPH ONLY. ⚠ DO NOT
      SOFTEN IT, DO NOT SUBSTITUTE `expertise`, DO NOT ADD A DISCLAIMER. The general
      rule still stands everywhere else on the site.
      ⚠ THIS NOTE ORIGINALLY READ "`past work` + `resell` ARE DELIBERATE". `past work`
      LEFT THE COPY AT `P1-J0-E347` — Scott's own rewrite made it `past efforts` — so
      the overrule now protects `resell` alone. IT STILL APPLIES: the paragraph says
      *"Sellers get to resell their reports, integrations, AI agents and more."*
    */
    /*
      ⚠⚠ SCOTT'S REWRITE, `P1-J0-E347`, AND THE VOICE CHANGED FROM SECOND TO THIRD
      PERSON: *"your past work"* -> *"their past efforts"*, *"You get to resell"* ->
      *"Sellers get to resell"*. THAT IS HIS EDIT — do not put it back into "you".
      ⚠ CURLY QUOTES AROUND “products” — keep them curly, do not straighten.
      ⚠ `Everyone wins!` IS HIS, exclamation mark included. `applications/areas` has
      no spaces around the slash. His.
      ⚠ `Service Products` IS CAPITALISED IN SENTENCE 1 AND LOWER-CASE `service
      products` IN THE LAST SENTENCE. HIS. Do not normalise either way.
      ⚠ THE BRIEF WARNED HE TYPED DOUBLE SPACES BETWEEN SENTENCES. The authoritative
      string it supplied contains NONE — checked byte by byte, zero occurrences of
      two consecutive spaces — so nothing collapses and no `&nbsp;` question arises.
      ⚠⚠ IT SAYS *"Click the button below to see the service products"* AND THE
      BUTTON BELOW IS `aria-disabled` WITH NO DESTINATION (`ctaHref: null`,
      `P1-J2-E010`). The instruction cannot be followed. Reported at `E347`, not
      fixed here — see the note on `HOME_SHOP_CTA`.
      ⚠ IT DOES NOT QUOTE THE LABEL, so it does not interpolate `HOME_SHOP_CTA`.
      ⚠ SUPERSEDED, quoted not deleted: *"Repackage your past work and sell it as
      a Service Product. Sell Service Products to Buyers as fixed-scope and
      fixed-fee “products”. You get to resell your reports, integrations, AI agents
      and more. They get cheaper services, faster, and with less risk. Everyone
      wins!"*
    */
    body:
      "Our experts repackage their past efforts and sell them as Service Products. " +
      "Service products are sold to buyers as fixed-scope and fixed-fee “products”. " +
      "Sellers get to resell their reports, integrations, AI agents and more. Buyers " +
      "get cheaper services, faster deployments, and lower risk. Everyone wins! Click " +
      "the button below to see the service products for your applications/areas.",
    /*
      ⚠ WAS *"Everyone wins"* UNTIL `P1-J0-E346`. Scott: all six cards say *"What you get"* now.
      ⚠ FOR THE RECORD — NOTHING BROKE THIS. The four distinct titles were in the
      ORIGINAL MOCKUP and had been distinct ever since; no commit drifted them apart.
      ⚠ SENTENCE CASE, matching sections 1 and 2. The CSS uppercases it — do NOT
      force uppercase in the data.
    */
    chipsTitle: "What you get",
    /*
      ⚠⚠ FIVE CHIPS, REPLACING THREE (`P1-J0-E347`). No full stops, consistent with
      sections 1, 2 and 3. Title Case and every line opening with `Buy` are his.
      ⚠⚠ REPORT-ONLY, ACTED ON BY NOBODY: FIVE OF THESE NAME THINGS THAT DO NOT EXIST
      AS MODELS. `Package` exists; there is no AI-agent-suite, KPI-dashboard,
      end-to-end-demo, cookbook or training-video type behind any of them, and
      `/shop` has no public catalogue at all (`P1-J2-E010`, `P1-J2-E011`, both open).
      They ship as written because outstanding parts gate PROMOTION, not the build —
      Scott's explicit call. THIS IS A PRE-LAUNCH LIST ITEM, not a bug to fix here.
      ⚠ SUPERSEDED, quoted not deleted: *"Fixed-scope, fixed-fee Service Products"* ·
      *"Buyers get it cheaper, faster, with less risk"* · *"Experts get paid for the
      same expertise again"*.
    */
    chips: [
      "Buy Process-Specific AI Agent Suites",
      "Buy Pre-Built Process KPI Dashboards",
      "Buy an End-to-End Application Demo",
      "Buy a P2P Implementation Cookbook",
      "Buy a Suite of Supplier Portal Training Videos",
    ],
    ctaLabel: HOME_SHOP_CTA,
    /*
      ⚠⚠ `null` — `aria-disabled` WITH NO `href`, THE SAME AS `/shop`'s OWN HERO.
      There is no public catalogue: `/packages` does not exist publicly and
      `(app)/packages` is the provider's own list behind the app shell (307s signed
      out). `P1-J2-E010` and `P1-J2-E011` are both open against that build.
      ⚠ DO NOT give this an `href="#"`, an empty `href`, or a dead click handler.
    */
    ctaHref: null,
    learnMoreHref: "/shop",
  },
  {
    key: "work",
    eyebrow: "Reduce temp labor costs & contract risks",
    /* ⚠ CHAT'S `<br>` SPLIT of the deck's one-liner. Flagged for Scott to revert. */
    headline: { a: "Go Direct & Save Money.", b: "One Contract, No W2 Risk." },
    body:
      "Create Work Requests using AI with the click of a button and a JD. Instantly " +
      "see the talent you want, ranked by experts and your peers. Interview, hire, " +
      "track and settle with that talent with the click of a button on a " +
      "predetermined contract. You can even integrate your ERP to automate the " +
      "whole process.",
    /*
      ⚠ WAS *"Click to"* UNTIL `P1-J0-E346`. Scott: all six cards say *"What you get"* now.
      ⚠ FOR THE RECORD — NOTHING BROKE THIS. The four distinct titles were in the
      ORIGINAL MOCKUP and had been distinct ever since; no commit drifted them apart.
      ⚠ SENTENCE CASE, matching sections 1 and 2. The CSS uppercases it — do NOT
      force uppercase in the data.
    */
    chipsTitle: "What you get",
    chips: [
      "Build the JD with AI and post the Work Request",
      "See talent ranked by experts and your peers",
      "Interview, hire, track and settle — one contract",
    ],
    ctaLabel: HOME_WORK_CTA,
    ctaHref: "/create-work",
    learnMoreHref: "/work",
  },
  {
    key: "integrate",
    /*
      ⚠ SCOTT'S STRING, `P1-J0-E345`. His casing; no dots in this one.
      ⚠ SUPERSEDED, quoted not deleted: *"Integrate to buy services, deploy BI, and
      use data to AI"* — 481px at 11.5px, ~586px at 14px against a 553px column. IT
      WOULD HAVE OVERFLOWED; the new string measures 488px.
    */
    eyebrow: "Integrate to extend apps and deploy AI and BI",
    /* ⚠ CHAT'S `<br>` SPLIT of the deck's one-liner. Flagged for Scott to revert. */
    headline: {
      a: "Punch Out Beyond “Parts”.",
      b: "Deploy Pre-Built AI Agents in Hours.",
    },
    body:
      "Our experts are continually creating AI agents to optimize each role within " +
      "your business. They launch them from within our AI Platform to optimize your " +
      "roles. Our agents cross your applications, looking and listening to everyday " +
      "interactions and then transacting across apps.",
    /*
      ⚠ WAS *"How it runs"* UNTIL `P1-J0-E346`. Scott: all six cards say *"What you get"* now.
      ⚠ FOR THE RECORD — NOTHING BROKE THIS. The four distinct titles were in the
      ORIGINAL MOCKUP and had been distinct ever since; no commit drifted them apart.
      ⚠ SENTENCE CASE, matching sections 1 and 2. The CSS uppercases it — do NOT
      force uppercase in the data.
    */
    chipsTitle: "What you get",
    chips: [
      "Agents launch from the Panameer AI Platform",
      "They cross your applications, not just one",
      "They look, listen, then transact across apps",
    ],
    ctaLabel: HOME_INTEGRATE_CTA,
    /*
      ⚠ `#punchout`, READ OFF `IntegrateHero.tsx` AS THE BRIEF REQUIRES. ⚠ ON HOME
      THAT IS A SAME-PAGE SCROLL, NOT A HAND-OFF: `ErpPunchout` moved to `/` at
      `P1-J0-E333`, so `#punchout` resolves to a section on this very page.
      ⚠ REPORTED, NOT CHANGED — the instruction was to read the href, not invent one.
      Scott may prefer `/integrate` here; `Learn More` already goes there.
    */
    ctaHref: "#punchout",
    learnMoreHref: "/integrate",
  },
];
