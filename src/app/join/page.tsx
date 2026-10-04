"use client";

import { useCallback, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OptionCard } from "@/components/onboarding/controls";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

type UserType = "seller" | "buyer";
type Job = "provider" | "recruiter" | "requester" | "buyer-admin";

const JOBS: Record<UserType, { id: Job; title: string; description: string }[]> = {
  seller: [
    {
      id: "recruiter",
      title: "Recruiter",
      description: "I sell service providers to service buyers",
    },
    {
      id: "provider",
      title: "Service Provider",
      description: "I sell my services to service buyers",
    },
  ],
  buyer: [
    {
      id: "requester",
      title: "Requester",
      description: "I hire talent and shop for service products",
    },
    {
      id: "buyer-admin",
      title: "Buyer",
      description: "I review other people's work requests",
    },
  ],
};

function JoinRouter() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  // a process, which made a five-second fork feel like paperwork.
  const typeParam = params.get("type");
  const isType = typeParam === "seller" || typeParam === "buyer";
  const step: 1 | 2 = isType ? 2 : 1;
  const userType = (isType ? typeParam : null) as UserType | null;

  const [choice, setChoice] = useState<UserType | Job | null>(null);

  const blockedParam = params.get("blocked");
  const fromParam = params.get("from");
  const nextParam = params.get("next");
  const followParam = params.get("follow");

  const withCtx = useCallback(
    (path: string) => {
      if (!blockedParam && !fromParam && !nextParam && !followParam) return path;
      const q = new URLSearchParams(path.includes("?") ? path.slice(path.indexOf("?") + 1) : "");
      if (blockedParam) q.set("blocked", blockedParam);
      if (fromParam) q.set("from", fromParam);
      if (nextParam) q.set("next", nextParam);
      if (followParam) q.set("follow", followParam);
      return `${path.split("?")[0]}?${q}`;
    },
    [blockedParam, fromParam, nextParam, followParam]
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
      /*
        ── ⚠⚠ THE BUYER WALKS THE REQUESTER WIZARD (`P1-A1.2-E421`) ────────────

        ⚠ SUPERSEDED, quoted not deleted:

            /* Buyer (the one who SUPPORTS the buying) is still the stub — its own
               journey, deliberately not in this brief.
               ⚠ LEFT EXACTLY AS IT WAS, INCLUDING NOT CARRYING THE CONTEXT.
               `P1-J1.2-E005` is out of scope: a fully written `/join/buyer` sits
               unreachable behind this line, and wiring it up would mint the orphan
               `brief_company_binding_trap` just fixed, because it has no company
               step. Reported, not touched. *\/
            router.push("/join/coming-soon?job=buyer");

        SCOTT, 2026-09-11: *"Lets use the same pathway pages as we used on
        requester for the buyer here. We get the same information just a
        different type of user."* And: *"i want them to both collect the same
        data. this cant be hard."*

        ⚠⚠ AND THE OLD COMMENT'S OBJECTION IS ANSWERED RATHER THAN IGNORED. It
        declined to wire up `/join/buyer` because that flow *"has no company
        step"* and would strand people unbound — measured, and true: two real
        accounts sit with a `BuyerProfile` and no `CompanyMembership`. ⚠ THIS
        LINE DOES NOT GO THERE. It enters the REQUESTER wizard, which has the
        company step, so the trap it warned about is not re-created — it is
        routed around.

        ⚠ ONE WIZARD, NO FORK. `?job=buyer` is the ONLY difference between this
        push and the `requester` case below it; every screen, step and question
        after it is the same code. ⚠ `withCtx` IS CARRIED NOW — the superseded
        line deliberately dropped `blocked`/`from`, so a buyer sent here by the
        transact gate lost the reason they came.
      */
      case "buyer-admin":
        router.push(withCtx("/join/requester?job=buyer"));
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
              ── ⚠⚠ SCOTT'S COPY, VERBATIM (`P1-J1.1-E286`, 2026-08-31) ────────────

              ⚠ SUPERSEDED, QUOTED NOT DELETED — TWO GENERATIONS OF IT, because the pair
              before last is what `E157` was actually about, and deleting it would lose the
              rule's origin:

                · `E249` (2026-08-29): *"I offer work to and buy service products from
                  service sellers"* / *"I provide services for and sell service products to
                  service buyers"*.
                · before that: *"I post work and hire validated experts"* / *"I perform work
                  on Panameer"*, carrying the note *"E157 — this read 'I offer work on
                  Panameer', which is what a SELLER does with their time. Two cards that both
                  start 'I offer' is the one thing this fork exists to disambiguate."*

              ⚠ AND THE `E249` REASONING IS SUPERSEDED WITH IT. It argued the pair was safe
              because *"Scott's Buyer line opens 'I offer' and his Seller line opens 'I
              provide', so the two still part on their FIRST TWO WORDS."* NOT ONE OF THOSE
              STRINGS EXISTS ANY MORE, so that argument now describes nothing.

              ⚠⚠ `E157` IS IN PLAY HERE AND SCOTT HAS ALREADY RULED — DO NOT REOPEN IT.
              These two lines are `I buy services` / `I sell services`: they part on the
              SECOND word, not the first. On the job picker above, `E287` makes BOTH seller
              lines open `I sell`, parting on the third word. HE WAS SHOWN THIS AND CHOSE IT
              — page 1 now says `I sell services`, so the echo on the seller side is
              deliberate reinforcement, not drift.
              ⚠ THE RULE STILL STANDS FOR ANY FUTURE EDIT: a fork whose two cards read the
              same way is the defect `E157` names. What changed is that Scott, who owns the
              copy, judged these distinguishable. THE STRINGS ARE NOT THE RULE.

              ⚠ SHIPPED EXACTLY AS HE TYPED THEM — no full stops, no capitalisation changes,
              no "and/or" tidying, and `service sellers` / `service buyers` left lower-case
              even though the card TITLES above are Title Case. DO NOT NORMALISE EITHER LINE.
            */
            description:
              "I buy services",
          },
          {
            id: "seller" as const,
            title: "Service Seller",
            description:
              "I sell services",
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
