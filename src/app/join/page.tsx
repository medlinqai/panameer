"use client";

import { useCallback, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OptionCard } from "@/components/onboarding/controls";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

/**
 * /join — the shared entry for four of the five actors (E139, WS1).
 *
 * TWO STEPS, not one list of three. It used to offer Service Buyer / Service
 * Provider / Recruiter side by side, which flattened two different questions
 * into one: whether you BUY or SELL on Panameer, and then what your JOB is on
 * that side. The reg-steps-by-user-type diagram models it as a fork —
 * Buyer/Provider? first, then Provider/Recruiter? or Requester/Buyer? — and
 * splitting it that way is also the only shape that scales, because the buyer
 * side has two jobs the flat list never offered at all.
 *
 * Both steps are ONE component rendering the same cards. The brief asks for the
 * same card/page format on both steps, and two components would be two chances
 * for them to drift apart.
 *
 * The step lives in the URL (`?type=`), so browser Back moves between steps for
 * free and a half-made choice is resumable. There is a Back button too — a
 * chooser with no visible way out reads as a trap.
 */

type UserType = "seller" | "buyer";
type Job = "provider" | "recruiter" | "requester" | "buyer-admin";

/*
  THE TAGLINE MOVED (E182). It lived here as a constant under E160, where it was
  rendered as this page's subtitle. It is now in the onboarding HEADER on every
  page of the shell, so it lives in `lib/brand.ts` — `OnboardingFrame` renders
  it, and this page renders `OnboardingFrame`, which would have made importing
  it back out of here a cycle.

  The page-1 subtitle that used to carry it is gone with it. Leaving both would
  have printed the same sentence twice on the same screen, six lines apart.

  ⚠⚠ THE SECOND HALF OF THE PARAGRAPH ABOVE IS NOW FALSE, AND `P1-J1.1-E246` §8 ON
  THIS BRANCH IS WHAT FALSIFIED IT. It says the descriptor *"is now in the onboarding
  HEADER on every page of the shell — `OnboardingFrame` renders it"*. ⚠ `E246` §8
  DELETED that header, along with its `Logo`, its divider and its `BRAND_DESCRIPTOR`
  paragraph, because `MarketingHeader` above the frame already carried the wordmark
  and the page was rendering two casings.
  ⚠ THE DESCRIPTOR IS STILL ON THE PAGE — `MarketingFooter` renders it twice, in its
  brand block and its legal bar — so the reason this page does not print it a second
  time still holds. Only WHERE it comes from changed. Quoted rather than rewritten
  over, because the no-duplicate rule above is the part that still governs.
*/

/*
  Page-2 options per page-1 choice.
  ⚠ ALL FOUR DESCRIPTIONS ARE SCOTT'S, VERBATIM — seller side from earlier, buyer
  side from `P1-J1.1-E250`. ⚠ SUPERSEDED, quoted: *"Seller copy is Scott's,
  verbatim"*, which was true when only that half was his and now understates it.
  ⚠ THE TWO SIDES PUNCTUATE DIFFERENTLY ON PURPOSE — see the note on `buyer` below.
*/
const JOBS: Record<UserType, { id: Job; title: string; description: string }[]> = {
  seller: [
    {
      id: "recruiter",
      title: "Recruiter",
      description: "I offer service providers to service buyers",
    },
    {
      id: "provider",
      title: "Service Provider",
      description: "I perform the services for a service buyer",
    },
  ],
  /*
    ── ⚠⚠ SCOTT'S BUYER-SIDE COPY, VERBATIM (`P1-J1.1-E250`, 2026-08-29) ────────

    ⚠ SUPERSEDED, quoted not deleted: *"I need services performed"* (Requester) and
    *"I support the buying"* (Buyer).

    ⚠⚠ THESE TWO END WITH A FULL STOP AND THE ROLE-CHOOSER PAIR AT `E249` DOES NOT.
    THAT IS HIS TYPING, NOT AN INCONSISTENCY TO FIX. Four strings on two screens of
    one flow now punctuate two different ways, deliberately. DO NOT add a stop to the
    `E249` pair, and DO NOT remove one from these — normalising either way is
    rewriting copy he typed.

    ⚠ THE SELLER SIDE ABOVE IS UNTOUCHED. He named only the buying side; `Recruiter`
    and `Service Provider` keep their own strings, which are also his and also
    stop-less.
  */
  buyer: [
    {
      id: "requester",
      title: "Requester",
      description:
        "I create work requests using service providers and the service products they offer.",
    },
    {
      id: "buyer-admin",
      title: "Buyer",
      description: "I manage pricing by commodity.",
    },
  ],
};

function JoinRouter() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  // E150 — no step counter on either page. It labelled a two-card question as
  // a process, which made a five-second fork feel like paperwork.
  const typeParam = params.get("type");
  const isType = typeParam === "seller" || typeParam === "buyer";
  const step: 1 | 2 = isType ? 2 : 1;
  const userType = (isType ? typeParam : null) as UserType | null;

  const [choice, setChoice] = useState<UserType | Job | null>(null);

  /**
   * ⚠ CARRY `?blocked=` AND `?from=` THROUGH THIS FORK — `P1-J1.2-E009`.
   *
   * `/create-work` and `guardTransact` redirect to `/company?blocked=…&from=…`
   * when a buyer has no company. From there a visitor reaches `/join`, and this
   * page then sends them onward — historically to a bare path, dropping both
   * parameters. So by the time `/join/buyer` refused them, nothing on the page
   * knew which door had closed or where they had been trying to go, and the only
   * link left was `/dashboard`. That is the dead end `P1-J1.2-E004` closed at
   * `/company` and this fork quietly re-opened one hop later.
   *
   * ⚠ THE AUTO-RESUME `router.replace` CALLS BELOW ARE THE ONES THAT MATTER.
   * `/join/buyer` is not reachable from the manual fork at all — `buyer-admin`
   * still goes to the coming-soon stub (`P1-J1.2-E005`, out of scope) — so the
   * ONLY way a signed-in buyer-side account lands on it is the resume redirect.
   */
  /* ⚠ `useCallback` ON THE TWO STRINGS, not on `params`. The resume effect below
     depends on this, and a fresh closure every render would re-fire its
     `/api/me` fetch on every render instead of only when the URL changes. */
  const blockedParam = params.get("blocked");
  const fromParam = params.get("from");
  const withCtx = useCallback(
    (path: string) => {
      if (!blockedParam && !fromParam) return path;
      const q = new URLSearchParams(path.includes("?") ? path.slice(path.indexOf("?") + 1) : "");
      if (blockedParam) q.set("blocked", blockedParam);
      if (fromParam) q.set("from", fromParam);
      return `${path.split("?")[0]}?${q}`;
    },
    [blockedParam, fromParam]
  );

  // Clear the selection when the step changes, so stepping back and forward
  // can't carry a page-1 answer into page 2's Continue.
  useEffect(() => {
    setChoice(null);
  }, [typeParam]);

  useEffect(() => {
    // Already signed in with a role? Resume onboarding rather than re-asking.
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        const roles = me?.person?.roles;
        if (roles?.isServiceProvider) router.replace(withCtx("/join/provider"));
        /*
          A signed-in buyer-side user resumes THEIR OWN flow. Requester and
          Buyer are both is_service_buyer, so the flag alone can't tell them
          apart — owning a requester profile can, and /api/me now says so.
        */
        else if (roles?.isRequester) router.replace(withCtx("/join/requester"));
        else if (roles?.isServiceBuyer) router.replace(withCtx("/join/buyer"));
        else setReady(true);
      })
      .catch(() => setReady(true));
  }, [router, withCtx]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  const go = () => {
    if (!choice) return;

    if (step === 1) {
      router.push(`/join?type=${choice}`);
      return;
    }

    switch (choice) {
      case "provider":
        router.push(withCtx("/join/provider"));
        break;
      case "recruiter":
        // PJv2 WS1 — one wizard, two itineraries; `type` picks which.
        router.push(withCtx("/join/provider?type=recruiter"));
        break;
      /*
        REQUESTER — a real flow now (P1-J1.2), not the coming-soon stub. It is
        the first actor the Simple/Web fulfillment thread needs, and until this
        landed the buying side of the fork dead-ended on both branches.
      */
      case "requester":
        router.push(withCtx("/join/requester"));
        break;
      /* Buyer (the one who SUPPORTS the buying) is still the stub — its own
         journey, deliberately not in this brief.

         ⚠ LEFT EXACTLY AS IT WAS, INCLUDING NOT CARRYING THE CONTEXT.
         `P1-J1.2-E005` is out of scope: a fully written `/join/buyer` sits
         unreachable behind this line, and wiring it up would mint the orphan
         `brief_company_binding_trap` just fixed, because it has no company step.
         Reported, not touched. */
      case "buyer-admin":
        router.push("/join/coming-soon?job=buyer");
        break;
    }
  };

  const options =
    step === 1
      ? [
          {
            id: "buyer" as const,
            title: "Service Buyer",
            /*
              ── ⚠⚠ SCOTT'S COPY, VERBATIM (`P1-J1.1-E249`, 2026-08-29) ────────────

              ⚠ SUPERSEDED, quoted not deleted — the pair this replaces was
              *"I post work and hire validated experts"* / *"I perform work on
              Panameer"*, carrying this reasoning:
                *"E157 — this read 'I offer work on Panameer', which is what a SELLER
                does with their time. Two cards that both start 'I offer' is the one
                thing this fork exists to disambiguate."*

              ⚠⚠ THAT CONCERN IS STILL MET, WHICH IS WHY THE NEW PAIR IS SAFE. `E157`
              banned two cards both opening *"I offer"*. Scott's Buyer line opens
              *"I offer"* and his Seller line opens *"I provide"*, so the two still
              part on their FIRST TWO WORDS and the fork still disambiguates. ⚠ THE
              COMMENT DESCRIBED COPY THAT NO LONGER EXISTS, which is why it was
              rewritten rather than left standing.
              ⚠ IF A FUTURE EDIT MAKES BOTH LINES OPEN THE SAME WAY, `E157` IS THE
              ROW IT REOPENS. That is the rule; the strings are not.

              ⚠ SHIPPED EXACTLY AS HE TYPED THEM — no full stops, no capitalisation
              changes, no "and/or" tidying, and `service sellers` / `service buyers`
              left lower-case even though the card TITLES above are Title Case. DO NOT
              NORMALISE EITHER LINE.
            */
            description:
              "I offer work to and buy service products from service sellers",
          },
          {
            id: "seller" as const,
            title: "Service Seller",
            description:
              "I provide services for and sell service products to service buyers",
          },
        ]
      : JOBS[userType!];

  return (
    <OnboardingShell
      contentWidth="max-w-lg"
      /*
        ⚠ THE BAND, WHICH THIS PAGE USED TO OPT OUT OF (`E246` §9). Secondary left,
        primary right — the shape the frame's band was built for.
        ⚠⚠ `Back` MOVED TOO, NOT JUST `Continue`. §9 names `Continue`, but the row it
        tells us to delete also held a step-2 `Back`; removing the row while moving
        only one of them would have LOST that control on step 2. Both moved, exactly
        as §5 did on the sign-up screen. Reported.
        ⚠⚠ THE DISABLED GATE IS UNCHANGED AND WAS NOT RE-WIRED: `disabled={!choice}`
        reads the same page state from the same scope, so `Continue` is still inert
        until a role is chosen. Nothing about how `go` fires changed.
        ⚠ `ml-auto` IS KEPT ON `Continue`. The band is `justify-between`, so with
        `Back` absent on step 1 a lone child would sit LEFT; `ml-auto` holds the
        primary action right on both steps.
      */
      footer={
        <>
          {step === 2 && (
            <button
              type="button"
              onClick={() => router.push("/join")}
              className="rounded-full border-[1.5px] border-line px-7 py-3 font-bold transition-colors hover:border-magenta hover:text-magenta"
            >
              Back
            </button>
          )}
          <button
            onClick={go}
            disabled={!choice}
            className="ml-auto rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            Continue
          </button>
        </>
      }
    >
      <div className="text-center">
        {/*
          E161 — the H1 names the QUESTION on the page. Both steps said "Welcome
          to Panameer", so the sub-fork read as the same screen rendered twice
          and the choice you were being asked to make had no heading at all.
        */}
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px]">
          {step === 1
            ? "Welcome to Panameer"
            : userType === "seller"
              ? "Whose Services Do You Sell?"
              : "What Do You Do on the Buying Side?"}
        </h1>
        {step === 1 ? (
          <p className="mt-2 text-[17px] text-ink-2">Which describes you best?</p>
        ) : (
          <p className="mt-2 text-[17px] text-ink-2">
            {userType === "seller"
              ? "This decides the profile you build."
              : "This decides what you can do on your company's account."}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {options.map((o) => (
          <OptionCard
            key={o.id}
            selected={choice === o.id}
            onClick={() => setChoice(o.id)}
            title={o.title}
            description={o.description}
          />
        ))}
      </div>

      {/*
        ── ⚠⚠ THE ACTION ROW MOVED TO THE FRAME'S BAND (`P1-J1.1-E246` §9) ────────

        Scott, walking `19f0d07` + §8: *"Want this line to go fullwidth."*
        ⚠ SUPERSEDED, quoted not deleted — this held a hand-rolled row,
        `<div className="mt-10 flex items-center gap-4 border-t border-line pt-6">`
        carrying a step-2 `Back` and `Continue`. Its `border-t` sat INSIDE the capped
        `max-w-lg` column, which is why the rule stopped short of the page edge.
        ⚠ THE SAME DEFECT AS §5's SIGN-UP SCREEN, ON A SECOND PAGE, and the same
        cause: this page passed no `footer`, so the frame's full-bleed band never
        rendered and the page drew its own rule instead.
        ⚠ THE RULE WAS NOT WIDENED TO FAKE IT. The band is full-bleed BY
        CONSTRUCTION; the fix is to use it, which is what §9 asked for.

        ⚠ ALSO GONE — *"Already have an account? Log In"*. Scott: *"don't need image
        1 (it is up in the header)."* `MarketingHeader` carries `Log In` now.
        ⚠⚠ ITS TWIN AT `SignUpForm.tsx:344` IS DELIBERATELY LEFT ALONE. The same
        reasoning applies to it, but Scott named ONLY `/join`. Reported at `E246` §9
        so he can rule on it — NOT swept because it looked consistent to do so.
      */}
    </OnboardingShell>
  );
}

export default function JoinPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
          Loading…
        </div>
      }
    >
      <JoinRouter />
    </Suspense>
  );
}
