"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { Avatar } from "@/components/Avatar";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { isPhoneComplete } from "@/lib/phone";
import { CompanyStep, type CompanyOutcome } from "@/components/company/CompanyStep";
import { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";

/**
 * The REQUESTER wizard — FOUR steps on the provider's shell (P1-J1.2 WS2).
 *
 * ⚠ IT WAS FIVE UNTIL `P1-J1.1-E263` (2026-08-30) removed `buyer_approver`.
 * The columns behind that screen are still on `RequesterProfile` and still in
 * the step route's zod schema — see `lib/requester-steps.ts` for why.
 *
 * WizardShell, OnboardingFrame and LocationFields are reused verbatim, so the
 * stepper, the footer band, the frame width and the address form are the same
 * objects the provider journey uses. Only the middle steps differ, which is
 * exactly the "one flow + role deltas" decision.
 *
 * SAVE-AS-YOU-GO, like the provider: every Continue posts its own step and the
 * server owns the resume point. There is no client-side progress to keep in
 * sync, and closing the tab on step 3 costs nothing.
 */

/*
  THE IN-WIZARD STEPPER'S LABELS — deliberately NOT the pre-flight card names.

  `REQUESTER_STEP_LABELS` in `lib/requester-steps.ts` carries Scott's tile names
  ("Company Details" / "Requester Details" / "Location Details"). He named the
  TILES on the intro page (`E259`), not this stepper, so the two are reported as
  different rather than silently unified into one string.
  ⚠ SUPERSEDED, quoted: this map also held `buyer_approver: "Buyer & Approver"`
  before `E263` removed that step.
*/
const LABELS: Record<RequesterStep, string> = {
  company: "Your Company",
  requester_info: "Requester Information",
  work_location: "Work Location",
  review: "Review",
};

type Draft = {
  companyId: string | null;
  companyName: string;
  firstName: string;
  lastName: string;
  /* `E281` — both already columns on `Person`; the wizard just never asked. */
  photoUrl: string | null;
  title: string;
  phone: string;
  employeeId: string;
  address: LocationValue;
  buyerName: string;
  buyerEmail: string;
  approverName: string;
  approverEmail: string;
  workLocation: LocationValue;
  /** True once the work location has been touched or loaded from the server. */
  workLocationSet: boolean;
};

const EMPTY: Draft = {
  companyId: null,
  companyName: "",
  firstName: "",
  lastName: "",
  photoUrl: null,
  title: "",
  phone: "",
  employeeId: "",
  address: {},
  buyerName: "",
  buyerEmail: "",
  approverName: "",
  approverEmail: "",
  workLocation: {},
  workLocationSet: false,
};

export default function RequesterStepsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<RequesterStep>("company");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    THE COMPANY STEP IS NOW THE SHARED BUILDING BLOCK (brief_company_model WS2).

    It owns its own define-or-join state and posts to /api/company/*, so this
    wizard no longer carries a picker, a typeahead or a companyName field. What
    it keeps is the Continue button — the step reports validity and hands back a
    submit function, because two primary actions on one screen is the confusion
    the shared footer band exists to prevent.
  */
  const companySubmit = useRef<null | (() => void)>(null);
  const [companyValid, setCompanyValid] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [pendingCompany, setPendingCompany] = useState<CompanyOutcome | null>(null);
  /* `E281` — drives the SHARED `PhotoCropModal`, the provider wizard's own uploader. */
  const [photoModal, setPhotoModal] = useState(false);

  const hydrate = useCallback((s: {
    emailVerified: boolean;
    completed: boolean;
    resumeStep: string;
    /*
      ⚠ THE REAL BINDING, from `/api/onboarding/requester/status`. Added to this
      type by `E274` so the Review row can ask whether a company EXISTS rather
      than inferring it from the resume point — see `companyAnswered` below.
      Optional because the same endpoint shape is used before the lookup runs.
    */
    company?: { bound?: boolean } | null;
    profile: {
      firstName: string; lastName: string; phone: string | null;
      photoUrl: string | null; title: string | null;
      employeeId: string | null; companyName: string;
      buyerName: string | null; buyerEmail: string | null;
      approverName: string | null; approverEmail: string | null;
      address: LocationValue | null; workLocation: LocationValue | null;
    };
  }) => {
    const p = s.profile;
    /*
      THE SIGNUP PLACEHOLDER IS NOT AN ANSWER.

      Every account is created with a company named after the person, so the
      company on the record before step 1 is saved reads "Nora Requester". Seeded
      into this field it becomes a pre-filled, valid-looking answer, and a
      requester who clicks straight through ends up working for a company named
      after themselves. Caught walking the wizard: the review page said COMPANY:
      Nora Requester.

      The step is answered once the server's resume point has moved past it.
    */
    /*
      ⚠⚠ "ANSWERED" NOW MEANS **BOUND**, NOT "PAST THAT STEP" (`P1-J1.1-E274`).

      ⚠ SUPERSEDED, quoted not deleted:
        `const companyAnswered =
           REQUESTER_STEPS.indexOf(s.resumeStep) > REQUESTER_STEPS.indexOf("company");`

      That heuristic was correct while the company step was MANDATORY — being
      past it proved you had answered it. `E274` made the step SKIPPABLE, and the
      moment it did, "past it" stopped implying "answered" and this line started
      reporting the signup placeholder as a real company.

      ⚠ CAUGHT BY WALKING GATE 7, NOT BY READING: a requester who skipped the
      step reached Review and saw `COMPANY: Test User 5` — the placeholder named
      after themselves — which is EXACTLY the defect the block above warns about
      ("a requester who clicks straight through ends up working for a company
      named after themselves. Caught walking the wizard: the review page said
      COMPANY: Nora Requester"). Making the step optional re-opened it.

      ⚠ THE SERVER ALREADY KNOWS THE ANSWER. `s.company.bound` is a real
      `CompanyMembership` lookup, so this asks the question directly instead of
      inferring it from a resume point — which is also why it cannot drift again
      the next time the step order changes.
    */
    const companyAnswered = !!s.company?.bound;
    const companyName = companyAnswered ? (p.companyName ?? "") : "";

    setDraft({
      companyId: null,
      companyName,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      photoUrl: p.photoUrl ?? null,
      title: p.title ?? "",
      phone: p.phone ?? "",
      employeeId: p.employeeId ?? "",
      address: p.address ?? {},
      buyerName: p.buyerName ?? "",
      buyerEmail: p.buyerEmail ?? "",
      approverName: p.approverName ?? "",
      approverEmail: p.approverEmail ?? "",
      workLocation: p.workLocation ?? {},
      workLocationSet: !!p.workLocation?.country,
    });
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding/requester/status");
      if (r.status === 401) {
        router.replace("/login?callbackUrl=%2Fjoin%2Frequester%2Fsteps");
        return;
      }
      if (r.status === 404) {
        router.replace("/join");
        return;
      }
      const s = await r.json();
      if (!s.emailVerified) {
        router.replace("/join/requester");
        return;
      }
      /*
        ── ⚠ DO NOT THROW OUT SOMEBODY THIS WIZARD IS THE ONLY CURE FOR ────────
        (P1-J1.2-E005)

        A completed requester WITH a company binding belongs on /ready and that
        redirect is right, unchanged. A completed requester with NO binding is the
        orphan this brief exists for: `requesterGaps` used to pass them on the
        strength of the signup placeholder's NAME, so `completed_at` got written
        while `Person.companyMemberships` stayed empty. They cannot transact, and
        `CompanyStep` — the only UI in the codebase that can create the
        membership they are missing — lives on the other side of this line.

        ⚠ THE NARROWEST CHANGE, DELIBERATELY. The brief suggested letting
        `?step=company` through; this page reads no query parameters at all, so
        adding that plumbing would be the WIDER change. Gating the bounce on the
        binding and opening on the company step achieves the same thing and
        touches the resume logic in one condition.
      */
      const unbound = s.completed && !s.company?.bound;
      if (s.completed && !unbound) {
        router.replace("/join/requester/ready");
        return;
      }
      hydrate(s);
      setStep(unbound ? "company" : ((s.resumeStep as RequesterStep) ?? "company"));
      setReady(true);
    })();
  }, [router, hydrate]);

  const idx = REQUESTER_STEPS.indexOf(step);

  /*
    THE PHONE MASK'S COUNTRY, NOW THAT STEP 2 HAS NO ADDRESS BLOCK (`E262`).

    `PhoneField` picks its rule from a country, and on `/join/provider` that
    comes from the address fields directly above it. Those are gone here, so it
    reads the SIGN-UP country instead — the country-only `Address` that
    `requester-onboarding.ts:120` seeds at account creation and that `hydrate`
    still loads into `draft.address`.
    ⚠ UNDEFINED IS A LEGAL ANSWER: `ruleFor(null)` returns null and
    `validatePhone` falls back to a generic length check, so a requester who
    signed up without a country still gets a usable field rather than a broken
    one.
  */
  const phoneCountry = draft.address.country;

  const save = async (payload: Record<string, unknown>, next?: RequesterStep) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/requester/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, payload }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that step.");
        return;
      }
      hydrate(body.state);
      setStep(next ?? REQUESTER_STEPS[idx + 1] ?? "review");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/requester/complete", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not finish.");
        return;
      }
      router.push("/join/requester/ready");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  const back = idx > 0 ? () => setStep(REQUESTER_STEPS[idx - 1]) : undefined;
  /*
    ── ⚠⚠ `Finish later` ON EVERY STEP (`P1-J1.1-E245`, 2026-08-30) ───────────

    `WizardShell` has taken `secondaryLabel` + `onSecondary` all along; this
    wizard passed neither, so step 1's footer had an empty left slot
    (`canBack: idx > 0`) and there was no way out of the flow at all except the
    browser's back button.

    ⚠ NOT "Cancel", DELIBERATELY. Nothing is cancelled by leaving: the account
    exists, the ToS is accepted, the email is verified, every step already saved
    itself, and `onboarding_step` brings them back to this exact screen. "Cancel"
    would describe a destructive action the button does not perform.

    ⚠⚠ ITS LANDING PAGE HAD TO BE FIXED FIRST. `/dashboard` for a requester with
    `completed_at: null` showed *"Build a provider profile"* — the wrong side of
    the marketplace. That branch is now in `(app)/dashboard/page.tsx`; without it
    this button was an exit into a worse room than an empty one. Reported.

    ⚠ ON THE REVIEW STEP TOO. Every step means every step — someone who reaches
    the summary and wants to check a detail with their approver should not have
    to abandon the tab to do it.
  */
  const shell = {
    step: idx + 1,
    totalSteps: REQUESTER_STEPS.length,
    stepLabel: LABELS[step],
    busy,
    onBack: back,
    canBack: idx > 0,
    secondaryLabel: "Finish later",
    onSecondary: () => router.push("/dashboard"),
  };
  const nextLabel = `Next: ${LABELS[REQUESTER_STEPS[idx + 1] ?? "review"]}`;

  // ---- 1/4 — Company ----------------------------------------------------
  if (step === "company") {
    /*
      A PENDING join is a STOP, not a step you continue past. The requester has
      asked to join a company and nobody has approved it, so there is no company
      to attach an address or a deliver-to to yet — carrying on would collect
      four screens of answers against a binding that may be rejected.
    */
    if (pendingCompany?.status === "PENDING") {
      return (
        <WizardShell
          {...shell}
          title={`Waiting on ${pendingCompany.name}.`}
          subtitle="Your request went to that company's admin. You'll be able to finish setting up as soon as they approve it."
          hideFooter
        >
          <div className="mx-auto w-full max-w-xl space-y-4">
            <Notice tone="info">
              We couldn&apos;t confirm you automatically because your work email
              isn&apos;t on that company&apos;s domain. That&apos;s normal — it
              just needs a person to say yes.
            </Notice>
            <button
              type="button"
              onClick={() => setPendingCompany(null)}
              className="text-[14.5px] font-bold text-magenta hover:underline"
            >
              Pick a different company instead
            </button>
          </div>
        </WizardShell>
      );
    }

    return (
      <WizardShell
        {...shell}
        title="Which Company Do You Buy For?"
        subtitle="Your company is the legal entity every work order and settlement is between. Join it if it's already here, or add it and become its admin."
        continueLabel={nextLabel}
        /*
          ── ⚠⚠ NO `continueDisabled` — THE COMPANY IS OPTIONAL (`E274`) ────────

          Scott: *"we still probably want to make the company optional at this
          point. We will need it before a work order could become a legal
          document."*

          ⚠ SUPERSEDED, quoted not deleted: `continueDisabled={!companyValid}`.

          ⚠⚠ THIS IS ONE OF THREE GATES THAT HAD TO GO TOGETHER, and the other two
          are in `lib/requester-onboarding.ts` — the two `requesterGaps` checks
          and the server-side throw in `saveRequesterStep`. Removing this one
          alone would have let somebody press Continue and hit a 400 they could
          do nothing about. See the block on `requesterGaps` for the full list
          and for where the requirement IS enforced (before HIRE).

          ⚠ OPTIONAL MEANS SKIPPABLE, NOT REMOVED. The step still renders, still
          binds a company when one is chosen, and still writes the membership
          through `/api/company/*`. `onContinue` below branches on whether the
          embedded form is actually answered.
        */
        busy={busy || companyBusy}
        onContinue={() => {
          /*
            ⚠ TWO PATHS, ONE BUTTON, AND THE BRANCH IS ON THE FORM'S OWN
            VALIDITY — not on a second control. A "Skip" button beside Continue
            was the alternative and was rejected: `WizardShell` already spends
            its one secondary slot on `Finish later` (`E245`), and a third
            action on a two-action footer is how people end up leaving by
            accident.
            · answered  -> submit it; `onDone` binds the company and advances.
            · untouched -> advance with no company at all. `save({})` posts the
              step so the SERVER moves `onboarding_step`; the wizard never owns
              the resume point.
          */
          if (companyValid) {
            companySubmit.current?.();
            return;
          }
          void save({});
        }}
      >
        <div className="mx-auto w-full max-w-xl">
          {error && (
            <div className="mb-4">
              <Notice>{error}</Notice>
            </div>
          )}
          <CompanyStep
            bounded
            submitRef={companySubmit}
            onValidityChange={setCompanyValid}
            onBusyChange={setCompanyBusy}
            onDone={(outcome) => {
              if (outcome.status === "PENDING") {
                setPendingCompany(outcome);
                return;
              }
              // Approved (defined, or joined on a domain match) — record it on
              // the wizard and move on. The company itself is already written;
              // this only advances the resume point.
              setDraft((d) => ({ ...d, companyName: outcome.name }));
              void save({ companyBound: true });
            }}
          />
        </div>
      </WizardShell>
    );
  }

  // ---- 2/4 — Requester Information --------------------------------------
  if (step === "requester_info") {
    return (
      <WizardShell
        {...shell}
        title="Tell Us Who You Are."
        subtitle="This is the person on the request — the contact a provider sees, and the identity your ERP sends if you connect one later."
        continueLabel={nextLabel}
        /*
          ⚠⚠ THE GATE IS FIRST + LAST + A COMPLETE PHONE, AND THAT IS TWO BRIEF
          CLAUSES RECONCILED (`E262` + `E242`, reported).

          `E262` says the gate "becomes first name + last name only" — it is
          describing the removal of the `!draft.address.country` clause that the
          deleted address block used to require. `E242` says phone BECOMES
          REQUIRED. Taken literally together they contradict: a required field
          the gate ignores is not required. So the address clause is gone and a
          phone clause replaces it.

          ⚠ `isPhoneComplete`, NOT `.trim()` — a half-typed number is not an
          answer, and `lib/phone.ts` already owns what "complete" means per
          country (`E203`). No new validation was written here.
        */
        continueDisabled={
          !draft.firstName.trim() ||
          !draft.lastName.trim() ||
          /*
            `E281` — photo AND title are REQUIRED, per Scott: *"The requester
            onboarding never asked me for a picture like the provider... it is
            annoying to have no image."*
            ⚠ VERIFIED SATISFIABLE BEFORE BEING MADE REQUIRED. Supabase storage
            is configured and 28 people already carry a `photo_url`, so this is
            not a gate nobody can pass — which is the failure mode that
            dead-ended this wizard once already this week.
            ⚠ GATED HERE, NOT IN `requesterGaps` — see the report. An existing
            requester already parked on `review` never re-passes this step, so
            the server does not enforce it retroactively.
          */
          !draft.photoUrl ||
          !draft.title.trim() ||
          !isPhoneComplete(draft.phone, phoneCountry)
        }
        onContinue={() =>
          save({
            firstName: draft.firstName,
            lastName: draft.lastName,
            /* `E281`. ⚠ NO `photoUrl` — `/api/profile/photo` already wrote it. */
            title: draft.title,
            phone: draft.phone,
            employeeId: draft.employeeId,
            /*
              ⚠ `address` IS NO LONGER POSTED (`E262`). The block that collected
              it is gone, so re-sending the hydrated copy would rewrite the
              signup-seeded Address from client state that no field on this
              screen can change. The record stays exactly as
              `requester-onboarding.ts:120` wrote it.
            */
          })
        }
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}

          {/*
            ── ⚠⚠ THE PROVIDER'S OWN UPLOADER, REUSED (`P1-J1.1-E281`) ──────────

            `PhotoCropModal` + `Avatar` is EXACTLY the pattern
            `join/provider/page.tsx:2746` uses on its own photo step, and the
            modal posts to the owner-scoped `POST /api/profile/photo`.

            ⚠ WHY THAT ROUTE NEEDED NO CHANGE: it already branches on whether the
            person has a `providerProfile` — providers go through
            `applyProviderSection` so `completeness` recomputes, and EVERYONE ELSE
            gets `Person.photo_url` written directly. A requester was always the
            "everyone else" case; nobody had ever sent one down it.

            ⚠ `PhotoUpload.tsx` WAS **NOT** USED, and it is the trap here. It
            looks like the obvious component and its own docblock says it is
            *"CURRENTLY UNUSED"* — the provider wizard uses this modal instead,
            because this one CROPS. Reusing the unused one would have shipped a
            second upload path for one column, which is the defect the brief
            named.
            ⚠ SO NOTHING WAS WRITTEN: no new component, no new route, no new
            column. The only new thing is the panel below.
          */}
          <div className="flex flex-col items-center gap-5 rounded-brand border border-line p-6 sm:flex-row sm:items-center sm:text-left">
            <Avatar
              firstName={draft.firstName}
              lastName={draft.lastName}
              photoUrl={draft.photoUrl}
              size={96}
            />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-ink">Your Photo *</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                Providers see this next to your name on a work request. A clear
                headshot gets a faster response than an empty circle.
              </p>
              <button
                type="button"
                onClick={() => setPhotoModal(true)}
                className="mt-3 rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-[#d9d4e2]"
              >
                {draft.photoUrl ? "Change Photo" : "Add a Photo"}
              </button>
            </div>
          </div>

          {/*
            ⚠⚠ A ROLE, NOT A SALES HEADLINE (`E281`). Same `Person.title` column
            the provider writes, and the copy is the whole difference: a provider
            types *"Oracle Cloud P2P Expert"* to be FOUND, a requester types
            *"Director of Procurement"* so a provider knows WHO THEY ARE TALKING
            TO. The label, placeholder and hint all say job, not pitch.
            ⚠ THE COPY IS CC'S AND IS REPORTED FOR SCOTT TO OVERRULE — he named
            the concept and the example, not these words.
          */}
          <Field
            label="Job Title *"
            hint="Your role at your company — for example, Director of Procurement. Providers see it next to your name."
          >
            <TextInput
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Director of Procurement"
              autoComplete="organization-title"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First Name *">
              <TextInput
                value={draft.firstName}
                onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last Name *">
              <TextInput
                value={draft.lastName}
                onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                autoComplete="family-name"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/*
              ⚠ THE BUILT VALIDATOR, NOT A RAW INPUT (`E241`). This was a plain
              `TextInput` while `PhoneField` — masking on change, validating on
              blur, backed by `lib/phone.ts` and `npm run check:phone` — was
              already shipping on `/join/provider`. No new validation was
              written; the component was imported.
            */}
            <PhoneField
              value={draft.phone}
              onChange={(next) => setDraft((d) => ({ ...d, phone: next }))}
              country={phoneCountry}
            />
            <div>
              <Field label="Employee ID">
                <TextInput
                  value={draft.employeeId}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, employeeId: e.target.value }))
                  }
                />
              </Field>
              {/*
                ⚠ THE HELPER SITS OUTSIDE `Field`, NOT IN ITS `hint` (`E261`).
                `Field` renders a `<label>` and its `hint` is typed `string`;
                an `<a>` inside a `<label>` is interactive content the HTML
                spec forbids there, and clicking it focuses the input instead
                of following the link. Same two lines, valid markup.
                ⚠ SUPERSEDED, quoted: the old hint read *"Your id in your own
                system. Optional — it's what links you to your ERP later."*
                ⚠ SCOTT'S WORDS, VERBATIM, INCLUDING THE PLAIN HYPHEN — it is
                not an en dash and was not "tidied" into one.
              */}
              <p className="mt-1 text-[13px] text-ink-2">
                Your HR ID - used for integrated buyers
              </p>
              {/*
                ⚠⚠ A NEW TAB, BECAUSE THIS LINK USED TO DESTROY THE FORM
                (`P1-J1.1-E277`, 2026-08-30).

                It was a plain in-app navigation out of a PART-FILLED wizard.
                Step 2 is save-as-you-go only on Continue, so clicking "learn
                more" threw away whatever was typed and browser-back returned an
                empty form — punishing exactly the person who stopped to read.

                ⚠⚠ THIS IS `E162` A SECOND TIME. That row fixed the identical bug
                on the signup form's Terms links and produced
                `components/legal/LegalLink.tsx`, whose docblock warned: *"Use
                this for EVERY legal link. The bug was one component doing it
                wrong while the others happened to be on pages with nothing to
                lose."* This page had something to lose.

                ⚠ `LegalLink` WAS DELIBERATELY NOT REUSED, AND NOT WIDENED.
                `/integrate` is a marketing page, not a legal document — routing
                it through a component named `LegalLink` would make the name
                false, and renaming that component to something generic would
                touch every legal call site to fix one marketing link. The two
                attributes are the whole of its behaviour, so they are applied
                here directly and this comment carries the reasoning instead.

                ⚠ A PLAIN `<a>`, NOT `next/link`. Client-side routing buys
                nothing for a tab that is about to be a fresh document, and it is
                the same shape `LegalLink` uses.
                ⚠ `rel="noopener noreferrer"` IS NOT OPTIONAL — `target="_blank"`
                without it hands the opened page a handle on this one.
                ⚠ AND NOT `window.open`. Scott raised popup blockers directly:
                blockers target SCRIPTED opens, not user-clicked anchors. This is
                an anchor a person clicked, so it is not a popup and is not
                blocked.
              */}
              <a
                href="/integrate"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block text-[13px] font-semibold text-magenta hover:underline"
              >
                Click here to learn more
              </a>
            </div>
          </div>

          {/*
            ⚠ THE SHARED MODAL. `onUploaded` fires only after the server has
            stored the file and returned its public URL, so `draft.photoUrl` can
            never hold a URL the database does not also have.
          */}
          <PhotoCropModal
            open={photoModal}
            onClose={() => setPhotoModal(false)}
            onUploaded={(photoUrl) => setDraft((d) => ({ ...d, photoUrl }))}
          />

          {/*
            ⚠⚠ THE `Your address` BLOCK STOOD HERE AND IS GONE (`E262`).

            ⚠ SUPERSEDED, quoted: a `<p>Your address</p>` heading over
            `<LocationFields withStreet>` bound to `draft.address`.

            ⚠ THE ADDRESS RECORD ITSELF SURVIVES. `requester-onboarding.ts:120`
            still creates a country-only `Address` from the sign-up country at
            account creation, and `draft.address` is still hydrated from it —
            which is what feeds the phone mask above and what Work Location
            pre-fills from. WORK LOCATION IS NOW THE ONLY FULL ADDRESS THIS
            WIZARD CAPTURES.
          */}
        </div>
      </WizardShell>
    );
  }

  /*
    ⚠⚠ THE `buyer_approver` SCREEN STOOD HERE AND IS GONE (`P1-J1.1-E263`).

    ⚠ SUPERSEDED, quoted not deleted so nobody rebuilds it from scratch: it
    asked *"Who buys with you, and who approves?"* under the sub-line *"One
    named approver is enough to start. Approval chains and spend thresholds are
    set up on the company later."*, collected `buyerName` / `buyerEmail` /
    `approverName` / `approverEmail` in two labelled sections, gated Continue on
    `approverName` alone, and closed with *"We record the name now. Nothing is
    sent to them yet — routing approvals is a later step."*

    Scott, 2026-08-30: *"we can leave it in the first onboarding page (for now),
    but it is likely to come out at some point."* The four columns survive on
    `RequesterProfile` and nothing gates on them.
  */

  // ---- 3/4 — Work Location ----------------------------------------------
  if (step === "work_location") {
    /*
      ⚠⚠ THIS FALLBACK IS NOT A PRE-FILL ANY MORE (`P1-J1.1-E278`, 2026-08-30).

      ⚠ THE LOGIC IS DELIBERATELY UNCHANGED and the comment is the fix. It reads
      "use the work location once touched, otherwise the requester's address" —
      which WAS a real pre-fill while step 2 collected a full address. `E262`
      deleted that block, so `draft.address` is now the country-only `Address`
      seeded at signup (`requester-onboarding.ts:120`) and NOTHING ELSE.

      So this supplies A COUNTRY and never a street, city or postcode. That is
      still worth having — it seeds the country select and drives the phone
      mask — but anyone reading it as "their address is already in here" will be
      wrong. ⚠ THE NOTICE THAT SAID EXACTLY THAT IS GONE; see below.
    */
    const wl = draft.workLocationSet ? draft.workLocation : draft.address;
    return (
      <WizardShell
        {...shell}
        title="Where Does the Work Happen?"
        /*
          ⚠⚠ NO SUBTITLE, AND THAT IS SCOTT'S ANSWER, NOT AN OMISSION (`E278`).
          Asked directly what should replace it, he said: **"none."**

          ⚠ SUPERSEDED, quoted not deleted: *"The deliver-to for your
          engagements. It starts as your own address — change it if the work
          lands somewhere else."* The second sentence described the `E262`
          pre-fill that no longer exists, so the line was half false; he chose to
          drop the whole thing rather than have chat draft a replacement.
          ⚠ DO NOT WRITE ONE. A subtitle here is copy Scott has already declined.
        */
        continueLabel={nextLabel}
        continueDisabled={!wl.country}
        onContinue={() => save({ workLocation: wl })}
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}

          {/*
            ⚠⚠ THE "Pre-filled from your address" NOTICE IS GONE (`E278`).
            Scott: *"that notice just gets removed."*

            ⚠ SUPERSEDED, quoted: *"Pre-filled from your address. Edit any field
            to make it different."* It was TRUE until `E262` deleted the address
            block on step 2; after that the fields rendered EMPTY under a banner
            claiming they were filled — a notice that contradicted the form
            directly beneath it.
            ⚠ ITS `sameAsYours` FLAG WENT WITH IT. Nothing else read it, and a
            computed value with no reader is a lint error waiting to happen.
          */}

          <div className="space-y-3">
            <LocationFields
              value={wl}
              onChange={(patch) =>
                setDraft((d) => ({
                  ...d,
                  workLocationSet: true,
                  workLocation: { ...(d.workLocationSet ? d.workLocation : d.address), ...patch },
                }))
              }
              withStreet
            />
          </div>
        </div>
      </WizardShell>
    );
  }

  // ---- 4/4 — Review ------------------------------------------------------
  const addr = (a: LocationValue) =>
    [a.line1, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ") ||
    "—";
  const rows: { label: string; value: string; step: RequesterStep }[] = [
    { label: "Company", value: draft.companyName || "—", step: "company" },
    {
      label: "Requester",
      value: `${draft.firstName} ${draft.lastName}`.trim() || "—",
      step: "requester_info",
    },
    /* `E281` — a required field belongs on the review. Employee ID is OPTIONAL
       and has always been listed, so omitting a REQUIRED one would be odd. */
    { label: "Job Title", value: draft.title || "—", step: "requester_info" },
    { label: "Phone", value: draft.phone || "—", step: "requester_info" },
    { label: "Employee ID", value: draft.employeeId || "—", step: "requester_info" },
    /*
      ⚠⚠ THE `Your Address` ROW IS GONE (`P1-J1.1-E279`, 2026-08-30).

      ⚠ SUPERSEDED, quoted not deleted:
        `{ label: "Your Address", value: addr(draft.address), step: "requester_info" }`

      Two things were wrong with it once `E262` removed the address block. Its
      VALUE was the signup-seeded country and nothing else, so it printed
      "United States" under a label promising an address. And its EDIT LINK
      pointed at `requester_info` — a step that no longer contains a single
      address field, so the one action the row offered led somewhere that could
      not honour it. A review row whose Edit goes nowhere useful is worse than no
      row: it invites a click that cannot work.

      ⚠ THE UNDERLYING `Address` RECORD IS NOT DELETED. It still exists, still
      holds the signup country, and still feeds the phone mask and the Work
      Location country. Only this row is gone.
    */
    {
      label: "Work Location",
      value: addr(draft.workLocationSet ? draft.workLocation : draft.address),
      step: "work_location",
    },
  ];

  return (
    <WizardShell
      {...shell}
      title="Check This Over."
      subtitle="Everything here is editable later — this is the shape a provider sees when you post work."
      continueLabel="Complete My Profile"
      onContinue={finish}
    >
      <div className="mx-auto w-full max-w-2xl">
        {error && (
          <div className="mb-4">
            <Notice>{error}</Notice>
          </div>
        )}
        <dl className="overflow-hidden rounded-brand border border-line">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex flex-wrap items-baseline gap-3 border-b border-line px-5 py-4 last:border-0"
            >
              <dt className="w-40 shrink-0 text-[13.5px] font-bold uppercase tracking-wide text-ink-2">
                {r.label}
              </dt>
              <dd className="min-w-0 flex-1 text-[15.5px]">{r.value}</dd>
              <button
                type="button"
                onClick={() => setStep(r.step)}
                className="text-[13.5px] font-bold text-magenta hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </dl>
      </div>
    </WizardShell>
  );
}
