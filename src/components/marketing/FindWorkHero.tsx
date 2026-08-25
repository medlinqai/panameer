import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";

/**
 * `/find-work`'s HERO — THE TWO-COLUMN TREATMENT (`P1-J4-E001`).
 *
 * Scott, 2026-08-24: *"we need to change the WORK image to be like LEARN/OPTIMIZE."*
 *
 * ⚠⚠ THIS WORK STREAM IS THE CONTAINER ONLY. Scott gave no new copy for this page
 * beyond the `<h1>` (`P1-J4-E003`). Every other string below is MOVED UNCHANGED out
 * of `MarketingHero`'s `HERO_COPY.provider` — the sub, the search placeholder, the
 * CTA label, the six tags and the résumé caption are all read from that constant
 * rather than retyped, so they cannot drift from where they came from.
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
 * ⚠ NO STAT ROW — same unsolved problem (`P1-J1-E013`): no honest provider count,
 * one published `Package`. Absent, not empty, not invented.
 * ⚠ NO BRIDGE LINE — Scott has not written one.
 * ⚠ NO VIDEO — `P1-J1-E011`.
 * ⚠ NO SEPARATE PASTE CONTROL IN THE HERO. The CTA leads to the door that already
 * exists; building a second one here would be two front doors to one flow.
 *
 * ⚠ THE `<h1>` IS FINAL (`P1-J4-E003`) and is not touched.
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
        <div className="relative mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {/*
                  ⚠ VERBATIM SCOTT, FINAL (`P1-J4-E003`): *"Deploy Faster. With Less
                  Risk. That works."* Both terminal periods are part of the string.
                  He accepted chat's edit of his own `Deploy Faster and/or with Less
                  Risk` — `and/or` is a contract construction, not a headline.
                */}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Deploy Faster. With Less Risk.
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
                */}
                <Link
                  href="/create-work"
                  className="mt-8 inline-block rounded-[12px] bg-magenta px-7 py-4 font-display text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  Create a Work Request
                </Link>

                {/*
                  ⚠ VERBATIM SCOTT (`P1-J4-E010`), AND BOTH FACTS BEHIND IT ARE
                  REPORTED RATHER THAN SOFTENED:

                    · `SHOP` IS `/buy-services`, WHOSE HERO LITERALLY READS
                      `PLACEHOLDER — Shop` and whose `<h1>` is `PLACEHOLDER —
                      headline about packaged services goes here.`
                    · THERE IS EXACTLY **ONE** PUBLISHED `Package` — *"Install
                      DocuSign for Oracle Cloud"* — AND IT IS OWNED BY **PANAMEER
                      ADMIN**, not a provider (`P1-J4-E008`).

                  ⚠ SO THIS LINE POINTS AT A PLACEHOLDER PAGE LISTING ONE OF OUR OWN
                  PRODUCTS. Shipped as written and linked, per instruction.
                */}
                <p className="mt-4 max-w-[520px] text-[13.5px] leading-[1.5] text-[#cdc9e6]">
                  <Link
                    href="/buy-services"
                    className="underline hover:text-white"
                  >
                    Search on the SHOP page to see a listing of pre-defined
                    Service Products
                  </Link>
                </p>
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
