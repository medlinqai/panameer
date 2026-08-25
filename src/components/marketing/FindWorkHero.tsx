import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";

/**
 * `/find-work`'s HERO — THE TWO-COLUMN TREATMENT (`P1-J4-E001`).
 *
 * Scott, 2026-08-24: *"we need to change the WORK image to be like LEARN/OPTIMIZE."*
 *
 * ⚠ EVERY STRING IN HERE IS SCOTT'S OWN NOW. It began as a container-only change
 * that borrowed the sub, the placeholder, the CTA label, the tags and the caption
 * from `MarketingHero`'s `HERO_COPY.provider`; `E009`..`E012` then removed every
 * one of those, and `E017`/`E018` replaced the rest. ⚠ NOTHING IS READ FROM
 * `HERO_COPY` ANY MORE and the constant itself is untouched — it still serves
 * `MarketingHero` on the pages that render it.
 *
 * ⚠ ITS OWN FILE, NOT AN EDIT TO `MarketingHero`, for the reason `HireTalentHero`
 * records: that component still serves `/buy-services`, `/enterprise` and
 * `/why-panameer`, and every change here is `/find-work`-only.
 *
 * ── ⚠⚠ THE HERO HAS ONE JOB: CREATE A WORK REQUEST (`P1-J4-E009`..`E012`) ───
 *
 * Scott walked this page after `532e6c8`. Everything that competed with that one
 * action came out, and the CTA is now the hero's ONLY control:
 *
 *   · the `GO DIRECT` pill                          removed (`E009`)
 *   · the search box + `Find Work →`                removed (`E009`)
 *   · the six domain tags                           removed (`E012`)
 *   · the `Learn. Connect. Create. Settle.` lockup  removed (`E009`)
 *   · the résumé/LinkedIn caption                   replaced by the sub (`E011`)
 *
 * ⚠ THE PILL: `brief_work_walk1` SAID **"DO NOT delete the pill"** AT LINE 28, and
 * the first pass kept it and reported the asymmetry, which is what that brief asked
 * for. Scott has now said to remove it. Both instructions were followed in turn;
 * neither was missed.
 *
 * ⚠ REMOVING THE SEARCH CLOSES `P1-J4-E007`. It posted `GET /explore?mode=work`,
 * which returns HTTP 200 and ZERO results — *"No Work Requests are open yet —
 * Panameer is pre-launch"* — a PROVIDER's search on the BUYER's page.
 *
 * ⚠ REMOVING THE LOCKUP CLOSES THE SECOND HALF OF `P1-J1-E019`. ⚠ IT STILL RENDERS
 * ON `/hire-talent` — verified — and Scott has not said to remove it there.
 *
 * ⚠ THE TAGS WENT FOR THREE REASONS, and the middle one is the load-bearing one:
 * the hero has one job and they were a second action; they filtered a search that no
 * longer exists; and repurposing them as "available resources" COUNTS CANNOT BE MADE
 * HONEST — the 85 `ProviderProfile` rows are SEED (`decisions-01.md`'s protected set
 * is the admin plus three experts), so any number beside a skill is seed dressed as
 * supply.
 *
 * ── ⚠ WHAT IS STILL DELIBERATELY ABSENT ────────────────────────────────────
 *
 * ⚠ NO STAT ROW — and it is BLOCKED, NOT FORGOTTEN (`P1-J1-E013`). Scott asked
 * *"Didn't we define cards on this one?"* and the answer is yes: `HeroTwoUp`'s
 * right column is the slot, and there is NO HONEST NUMBER TO PUT IN IT. The 85
 * `ProviderProfile` rows are SEED — `decisions-01.md`'s protected set is the admin
 * plus three experts — and exactly ONE `Package` is published, owned by Panameer
 * Admin. Absent, not empty, not invented.
 * ⚠ NO BRIDGE LINE — Scott has not written one.
 * ⚠ NO SEPARATE PASTE CONTROL IN THE HERO. The CTA leads to the door that already
 * exists; building a second one here would be two front doors to one flow.
 *
 * ⚠ THE HOW-IT-WORKS TAGLINE UNDER THE SPINE IS STILL MISSING (`P1-J4-E013`) —
 * the eyebrow renders with nothing after it. `/optimize` and `/learn` both carry
 * one and both are Scott's. NOT DRAFTED HERE.
 *
 * ── ⚠⚠ STILL NO VIDEO — AND THIS TIME IT WAS BUILT, MEASURED AND REMOVED ───
 *
 * `P1-J4-E019`. Scott: *"No video in the background on the hero...please add
 * one."* It was added, wired through `HeroVideoBackdrop` exactly as `/learn` and
 * `/` do, and measured on a PRODUCTION build under DevTools' own Fast 3G preset.
 * ⚠ IT TRIPPED THE BRIEF'S OWN STOP CONDITION AT EVERY WIDTH AND CAME BACK OUT.
 * The numbers are in the section comment below. Do not re-add it from Scott's
 * request alone — the request is not the thing that changed.
 */
export function FindWorkHero() {
  /* ⚠ NOTHING IS READ FROM `HERO_COPY.provider` ANY MORE. `P1-J4-E009`/`E011`/`E012`
     removed the pill, the search, the tags and the caption — every string this hero
     used to borrow from the shared constant. What is left is Scott's own copy for
     this page. ⚠ THE CONSTANT ITSELF IS UNTOUCHED and still serves `MarketingHero`
     on the pages that still render it. */
  return (
    /*
      ⚠ THE SAME `HeroBox` + GRADIENT `MarketingHero` GAVE THIS PAGE, transcribed so
      the container change is not also a visual change. `HeroTwoUp` supplies the two
      columns; nothing about the surface is new.
    */
    <HeroBox cardClassName="bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
      <section className="px-6 py-16 min-[900px]:py-[84px]">
        {/*
          ── ⚠⚠ THE HERO CLIP WAS BUILT AND MEASURED OUT (`P1-J4-E019`) ─────────

          Scott: *"No video in the background on the hero...please add one."* It
          was added — `HeroVideoBackdrop`, `/panameer-office.mp4`, `opacity-40`,
          with this card's own three hexes re-laid as the scrim at `/learn`'s
          alphas — then measured, and the brief's stop condition fired.

          ⚠ MEASURED ON A PRODUCTION BUILD, NOT LOCALHOST, under DevTools' Fast 3G
          preset (1.6Mb/s ×0.9, 562.5ms RTT). Localhost is why this was missed the
          first time on `/hire-talent`: unthrottled, LCP with the clip in was
          104-136ms, FASTER than several unclipped runs.

              Fast 3G LCP, /find-work        1440      900      390
              lazy sequence, no hero clip   1,636    1,672    1,636 ms
              + panameer-office.mp4         5,772    5,788    5,616 ms

          ⚠ THE STOP CONDITION IS 4s AT ANY WIDTH. It failed at ALL THREE, by
          ~1.6s, reproducibly across two runs — so the clip is not here.

          ⚠ THE MECHANISM, BECAUSE IT DECIDES WHETHER A SMALLER CLIP WOULD HELP:
          the LCP ELEMENT CHANGES. Without the clip the largest paint is the
          headline at ~1.67s; with it, the `<video>` itself becomes the LCP element
          and the number is simply when its first frame decodes. 9.21MB over a
          188KB/s pipe is ~49s to finish, and ~5.7s to the first frame even though
          the file IS already faststart (`moov` before `mdat`, verified). So this
          is a WEIGHT problem, and it is the only clip that can go here at all —
          `VideoSequence` further down this page plays the other four, and any of
          them in the hero would repeat on the page.

          ⚠ NOT TRANSCODED, TRIMMED OR RE-ENCODED. That is an asset change and
          Scott's call, not CC's. A ~1.5MB cut of this footage would very likely
          clear 4s; nobody has authorised making one.

          ⚠ WHAT WAS SHIPPED INSTEAD IS THE BUDGET FIX THAT HAD TO COME FIRST —
          `VideoSequence` no longer eagerly loads 10.63MB below the fold
          (`P1-J1-E018`). First load on this page went 11.01MB -> 0.39MB. That
          headroom is now banked for whenever a hero clip does arrive.

          ⚠ `HeroVideoBackdrop` IS UNTOUCHED and still serves `/`, `/learn` and
          `LearnHome` — the `E164` shape: the component stays, this page just does
          not call it.
        */}
        <div className="relative mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/*
                  ── ⚠⚠ SCOTT'S OWN HEADLINE (`P1-J4-E017`) ──────────────────────

                  He asked chat for suggestions and took NEITHER — this is his. It
                  replaces `Deploy Faster. With Less Risk.` (`P1-J4-E003`), which was
                  also his and which MOVES TO `/buy-services` (`P1-J2-E001`).

                  ⚠ TWO NORMALISATIONS, BOTH REPORTED RATHER THAN DONE QUIETLY. He
                  typed `Save Money.  Go Direct` — DOUBLE SPACE after the first
                  period, NO terminal period. The space is collapsed to one, and the
                  final period is ADDED so the string matches the two-sentence shape
                  every other hero on the site uses (`Deploy Faster. With Less Risk.`;
                  `Go from Zero to Hero…and Stay There` is the one exception, and it
                  is not two sentences).

                  ⚠ `Go Direct` IS THE PILL TEXT REMOVED FROM THIS HERO IN
                  `P1-J4-E009`. It comes back as the headline. Reported because it
                  reads as deliberate reuse — the phrase was never the problem, a
                  second competing element in the hero was.

                  ⚠ IT IS ALSO THIS PAGE'S FIRST SELLER-FACING WORD SINCE THE PAGE WAS
                  RE-POINTED AT BUYERS (`P1-J4-E002`) — `Save Money` is the buyer's
                  half, `Go Direct` is the seller's. Reported, not resolved.
                */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Save Money. Go Direct.
                </h1>

                {/*
                  ── ⚠ THE HERO'S ONLY CONTROL (`P1-J4-E010`) ────────────────────

                  ⚠ IT POINTS AT `/create-work`, WHICH IS UNDER `(app)` AND
                  307-REDIRECTS TO `/login` FOR AN ANONYMOUS VISITOR. Verified
                  2026-08-24. ⚠ SO THE PRIMARY CTA ON A PUBLIC PAGE BOUNCES OFF A
                  LOGIN WALL — that is `P1-J0-E316`'s shape. THE AUTH BEHAVIOUR IS
                  NOT CHANGED HERE; it is reported.

                  ⚠ `check:app-shell`'s PUBLIC HERO guard requires a hero to offer
                  something to click. After `E009` removed the search box this button
                  is the only thing satisfying it — the same dependency that made
                  removing `/hire-talent`'s search turn that guard red.

                  ── ⚠⚠ AND THIS LABEL FAILS WCAG AA. IT IS NOT THIS PAGE'S BUG ────

                  White on brand magenta `#d72cd6` is **4.02:1**. The label is 16px
                  bold, which is BELOW WCAG's large-text floor (18.66px bold), so the
                  threshold is 4.5 and it misses. ⚠ THE FILL IS OPAQUE, so this has
                  nothing to do with footage and did not move across any of the nine
                  frames measured for `E019` — 4.02 at 1440, 900 and 390 alike, and
                  4.02 before the clip was ever added.

                  ⚠ IT IS A BRAND-TOKEN FACT, NOT A LOCAL ONE — `--color-magenta`
                  under white text reads 4.02 everywhere it is used. `magenta-dark`,
                  which this button already uses on hover, is 5.74 and would pass.
                  ⚠ NO COLOUR CHANGED HERE: the brief says measure, report and change
                  nothing, and a brand token is not a `/find-work` decision.
                */}
                <Link
                  href="/create-work"
                  className="mt-8 inline-block rounded-[12px] bg-magenta px-7 py-4 font-display text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  Create a Work Request
                </Link>

                {/*
                  ── ⚠⚠ THE SHOP LINE IS GONE, AND IT WAS SCOTT'S OWN, ADDED TODAY ─

                  `Search on the SHOP page to see a listing of pre-defined Service
                  Products` went IN as `P1-J4-E010` and comes OUT as `P1-J4-E018` —
                  a SAME-DAY REVERSAL by the same person. Recorded here so nobody
                  restores it citing E010; E018 is the later instruction.

                  ⚠ ITS REMOVAL ALSO CLOSES THE FLAG RAISED WHEN IT SHIPPED. The line
                  linked to `/buy-services`, whose hero still literally reads
                  `PLACEHOLDER — Shop` over `PLACEHOLDER — headline about packaged
                  services goes here.`, and which lists exactly ONE published
                  `Package` — *"Install DocuSign for Oracle Cloud"* — owned by
                  PANAMEER ADMIN rather than a provider (`P1-J4-E008`). The public
                  site no longer points a buyer at that page from this hero. ⚠ THE
                  PLACEHOLDER PAGE ITSELF IS UNCHANGED and is still reachable from the
                  header nav; only this doorway is closed.

                  ⚠ THE HERO IS BACK TO EXACTLY ONE CONTROL, which is what `E009`..
                  `E012` were for. `check:app-shell`'s PUBLIC HERO guard is satisfied
                  by the button alone.
                */}
              </>
            }
            right={
              <>
                {/*
                  ── ⚠⚠ VERBATIM SCOTT (`P1-J4-E011`), AND IT IS THE ONLY FULLY-
                  BACKED HERO CLAIM ON THE SITE ────────────────────────────────

                  Verified end to end 2026-08-24. `/create-work` step 1 opens on
                  "Bring your JD" with three doors, and `Paste your JD` is FIRST,
                  badged `Fastest` and marked `primary`. It posts to
                  `POST /api/work-requests/import`, which AI-parses the JD and calls
                  `createDraft`, then `saveSection` for **description + title**,
                  **start/end dates**, **budget type and min/max**, and
                  **location country + worksite**. Skills are returned but NOT saved,
                  deliberately — they cannot be validated until a role and domain
                  exist. So a real `DRAFT` row is created and pre-filled from the
                  paste. This sentence describes something that works.

                  ⚠ WITH ONE HONEST CAVEAT ON THE **FIRST CLICK**: signed out, the
                  button lands on `/login`, not on the paste door. The capability is
                  real; the sentence over-promises the first click for an anonymous
                  visitor by exactly one login wall.

                  ⚠ HIS CURLY QUOTES AROUND "Create Work Request" — SHIPPED AS TYPED.
                  ⚠ AND THEY DO NOT MATCH THE BUTTON, WHICH READS `Create a Work
                  Request` WITH AN `a`. Both are his. NOT SILENTLY ALIGNED — reported.

                  ⚠ `AIP` IS USED HERE WITHOUT EXPANSION. `/optimize` expands it on
                  first use (`Panameer's AI Platform (AIP)`, `P1-J0-E275`); this page
                  never does. Reported.
                */}
                <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                  Click the &ldquo;Create Work Request&rdquo; button, upload
                  your job description (aka JD), and let the Panameer AIP build
                  your work request for you.
                </p>
              </>
            }
          />
        </div>
      </section>
    </HeroBox>
  );
}
