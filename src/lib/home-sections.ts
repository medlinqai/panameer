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
 *     Start the Assessment             Start Your Free Optimization Assessment
 *     Start Learning Now               Start Learning for Free
 *     Start Shaping Your Time          Create My Profile
 *     Start Reselling Your Work        Shop Service Products
 *     Start Posting Your Work          Create a Work Request
 *     Integrate with Panameer's AIP    How We Integrate
 *
 * ⚠ THEY ARE STILL CONSTANTS, single-sourced WITHIN HOME — one live literal each,
 * because the same rule that made the page labels constants applies here
 * (`P1-J4-E024`: `/work` shipped two different strings for one button).
 */

/*
  ⚠ RELABELLED 2026-08-27 (`P1-J0-E337`): `Start the Assessment` -> this. Scott's
  words, and the body copy beside it QUOTES this constant — never retype it.
  ⚠ THE `href` DID NOT CHANGE (`/assess`).
  ⚠ IT NOW MATCHES `HomeHero`'s DEFAULT `ctaLabel`, which is not an accident: this
  section replaced `HomeHero` as `/`'s hero, so it inherited the label with the job.
*/
export const HOME_OPTIMIZE_CTA = "Take Our Free Assessment";
export const HOME_LEARN_CTA = "Start Learning Now";
export const HOME_TALENT_CTA = "Start Shaping Your Time";
export const HOME_SHOP_CTA = "Start Reselling Your Work";
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
  /** ⚠ ALWAYS THREE. The panel's numerals are 1-3. */
  chips: [string, string, string];
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
    eyebrow: "See Your Options - Build Your AI Roadmap",
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
    body:
      "Click the button below, answer several questions, and submit your answers. " +
      "Next, Panameer will build your AI Optimization Dashboard (listing the " +
      "possible solutions for your organization). Review those solutions and click " +
      "the button to schedule a meeting with an expert. Together, we will review " +
      "and prioritize your options to create a 1 year AI Roadmap. All for free. " +
      "You can even use our project tracker to manage the deployment!",
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
    chips: [
      "See your ranking",
      "See a list of possible solutions for your organization/business process",
      "Review and prioritize those solutions with an expert",
    ],
    ctaLabel: HOME_OPTIMIZE_CTA,
    ctaHref: "/assess",
    learnMoreHref: "/optimize",
  },
  {
    key: "learn",
    /* ⚠ `GET SUPPORT WHILE`, Scott 2026-08-27, replacing the deck's `BET BTTER`. */
    eyebrow: "Expand your services…get support while delivering them",
    headline: { a: "Learn New Skills & Build a Support Network" },
    body:
      "Sign up for Panameer. Enroll in one or more learning paths, take the courses, " +
      "watch the lessons — all for free. Connect with the learning path community " +
      "or specifically with that instructor. When you are ready, take the " +
      "certification test and work your network to get working and keep working.",
    chipsTitle: "What you get",
    chips: [
      "Learning paths, courses and lessons — free",
      "The path community, and the instructor directly",
      "A certification test, then a network to work",
    ],
    ctaLabel: HOME_LEARN_CTA,
    ctaHref: "/learn/paths",
    learnMoreHref: "/learn",
  },
  {
    key: "talent",
    eyebrow: "Get the talent your business needs…when it needs it",
    headline: { a: "Sell More Time by Shaping It to Client Needs" },
    body:
      "Clients need expert help at different inflection points and for different " +
      "durations during the software lifecycle. By offering one or multi-day " +
      "consultations, monthly retainers as well as long term time and expense work, " +
      "both parties are incentivized to create better incomes and better outcomes.",
    chipsTitle: "Shape your time",
    chips: [
      "One-day and multi-day consultations",
      "Monthly retainers",
      "Long-term time and expense work",
    ],
    ctaLabel: HOME_TALENT_CTA,
    ctaHref: "/join/provider",
    learnMoreHref: "/talent",
  },
  {
    key: "shop",
    eyebrow: "Deploy cheaper and faster…with less risk",
    /* ⚠ CHAT'S `<br>` SPLIT of the deck's one-liner. Flagged for Scott to revert. */
    headline: { a: "Don’t Just Sell Your Time…", b: "Resell Your Work" },
    /*
      ⚠⚠ VERBATIM, AND `past work` + `resell` ARE DELIBERATE. Scott, 2026-08-27,
      OVERRULED the 2026-08-27 copy rule in `decisions-01.md` FOR THIS PARAGRAPH
      ONLY. ⚠ DO NOT SOFTEN IT, DO NOT SUBSTITUTE `expertise`, DO NOT ADD A
      DISCLAIMER. The general rule still stands everywhere else on the site.
    */
    body:
      "Repackage your past work and sell it as a Service Product. Sell Service " +
      "Products to Buyers as fixed-scope and fixed-fee “products”. You get " +
      "to resell your reports, integrations, AI agents and more. They get cheaper " +
      "services, faster, and with less risk. Everyone wins!",
    chipsTitle: "Everyone wins",
    chips: [
      "Fixed-scope, fixed-fee Service Products",
      "Buyers get it cheaper, faster, with less risk",
      "Experts get paid for the same expertise again",
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
    chipsTitle: "Click to",
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
    eyebrow: "Integrate to buy services, deploy BI, and use data to AI",
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
    chipsTitle: "How it runs",
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
