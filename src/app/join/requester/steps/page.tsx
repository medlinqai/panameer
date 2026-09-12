"use client";

/* ⚠ `useRef` LEFT WITH THE COMPANY STEP (`E418`) — it held `companySubmit`. */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { Avatar } from "@/components/Avatar";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { isPhoneComplete, parseStoredPhone, toE164 } from "@/lib/phone";
import { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";

/**
 * The REQUESTER wizard — THREE steps on the provider's shell (P1-J1.2 WS2).
 *
 * ⚠⚠ THE COMPANY STEP IS GONE (`P1-A1.4-E418`, 2026-09-11) — the whole screen,
 * not just its requirement. Scott: *"Regarding the company… strip it all out."*
 * A company is captured ONCE, at work order acceptance (`lib/orders.ts`), so
 * that the web path and the ERP path agree on when a buyer becomes a company:
 * the PO is the first time a company name exists for an ERP client.
 *
 * ⚠ `CompanyStep` IS NOT DELETED (`E164`) — it is unimported HERE and lives on
 * for the work-order-acceptance capture. This file no longer references it, its
 * outcome type, or any company state.
 *
 * ⚠ IT WAS FOUR UNTIL `E418`, and FIVE UNTIL `P1-J1.1-E263` removed
 * `buyer_approver`.
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
  ("Requester Details" / "Location Details"). He named the TILES on the intro
  page (`E259`), not this stepper, so the two are reported as different rather
  than silently unified into one string. ⚠ DO NOT UNIFY THEM.
  ⚠ SUPERSEDED, quoted: this map also held `buyer_approver: "Buyer & Approver"`
  before `E263` removed that step, and `company: "Your Company"` before `E418`
  removed the company step from every journey.
*/
const LABELS: Record<RequesterStep, string> = {
  requester_info: "Requester Information",
  work_location: "Work Location",
  review: "Review",
};

/*
  ⚠ NO `companyId` / `companyName` (`E418`). The wizard collects no company at
  all, so carrying either would be a field with no question behind it — and
  `companyName` in particular was the signup placeholder, which is how a
  requester ended up "working for a company named after themselves".
*/
type Draft = {
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
  const [step, setStep] = useState<RequesterStep>(REQUESTER_STEPS[0]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    ⚠ SUPERSEDED, quoted not deleted (`E418`): this wizard held five pieces of
    company state — `companySubmit`, `companyValid`, `companyHasName`,
    `companyBusy` and `pendingCompany` — to drive the embedded `CompanyStep` and
    its define-or-join outcome. With no company question there is nothing to
    submit, nothing to validate and no PENDING approval to wait on, because
    nobody is claiming a company at registration any more.
  */
  /* `E281` — drives the SHARED `PhotoCropModal`, the provider wizard's own uploader. */
  const [photoModal, setPhotoModal] = useState(false);

  /*
    ── ⚠⚠ THE PHONE'S OWN COUNTRY, AND IT IS NOT THE ADDRESS'S (`P1-ALL-E417`) ─

    ⚠ SUPERSEDED, quoted not deleted: `const phoneCountry = draft.address.country;`
    with the note that *"it reads the SIGN-UP country instead… ⚠ UNDEFINED IS A
    LEGAL ANSWER: `ruleFor(null)` returns null and `validatePhone` falls back to
    a generic length check."*

    ⚠⚠ THAT FALLBACK WAS THE DEFECT, NOT THE SAFETY NET. The sign-up form's
    country select DEFAULTS to "United States" and step 1 never shows it, so an
    Indian or Saudi requester who left the default was silently judged by the US
    ten-digit rule — a nine-digit Saudi mobile came back *"too short"* and
    `Continue` stayed dead, with nothing on screen naming the country it assumed.

    SCOTT, 2026-09-12: *"The phone value validates against the SELECTED country
    in that control, not the sign-up country and not `draft.address.country`."*

    ⚠ SEEDED ONCE, THEN OWNED BY THE PICKER. `hydrate` sets it from the STORED
    number first (E.164 carries its own country) and falls back to the sign-up
    country; after that only the person moves it. ⚠ IT IS NEVER RE-POINTED AT
    `draft.address.country` — Scott: *"do not overwrite one from the other."* A
    consultant in Dubai with a British mobile is not a data-entry error.
  */
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);

  const hydrate = useCallback((s: {
    emailVerified: boolean;
    completed: boolean;
    resumeStep: string;
    /*
      ⚠ STILL ON THE PAYLOAD, NO LONGER READ HERE (`E418`). The status endpoint
      keeps returning the binding — `/company` and the admin surfaces read it —
      but this wizard asks no company question, so it consumes none of it.
      ⚠ SUPERSEDED, quoted not deleted: `E274` added it so the Review row could
      ask whether a company EXISTS rather than infer it from the resume point.
    */
    company?: { bound?: boolean } | null;
    profile: {
      firstName: string; lastName: string; phone: string | null;
      photoUrl: string | null; title: string | null;
      employeeId: string | null;
      buyerName: string | null; buyerEmail: string | null;
      approverName: string | null; approverEmail: string | null;
      address: LocationValue | null; workLocation: LocationValue | null;
    };
  }) => {
    const p = s.profile;
    /*
      ⚠⚠ THE WHOLE "IS THE PLACEHOLDER AN ANSWER?" PROBLEM IS GONE (`E418`).

      ⚠ SUPERSEDED, quoted not deleted — two successive fixes to one defect:
        `const companyAnswered =
           REQUESTER_STEPS.indexOf(s.resumeStep) > REQUESTER_STEPS.indexOf("company");`
        `const companyAnswered = !!s.company?.bound;`
        `const companyName = companyAnswered ? (p.companyName ?? "") : "";`

      Every account is still created with a company named after the person
      (the P-Account → Company → Site → Address → Person backbone), and that
      placeholder is still not an answer — which is why the review card showed
      `COMPANY: Nora Requester` twice in this journey's history. `E418` removes
      the QUESTION, so there is no field for a placeholder to leak into and no
      "answered" to infer. The trap cannot re-open, because the screen it
      re-opened on no longer exists.
    */
    /*
      ⚠ THE STORED NUMBER IS THE FIRST SOURCE OF TRUTH (`E417`). A number saved
      by this field is E.164, so it names its own country; only a legacy national
      string or an empty field falls back to the sign-up country.
    */
    const stored = parseStoredPhone(p.phone);
    setPhoneCountry(stored.country ?? p.address?.country ?? null);

    setDraft({
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      photoUrl: p.photoUrl ?? null,
      title: p.title ?? "",
      phone: stored.display,
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
        ── ⚠⚠ THE UNBOUND BOUNCE IS GONE (`P1-A1.4-E418`) ──────────────────────

        ⚠ SUPERSEDED, quoted not deleted (`P1-J1.2-E005`):
          `const unbound = s.completed && !s.company?.bound;`
          `if (s.completed && !unbound) { router.replace(".../ready"); return; }`
          `setStep(unbound ? "company" : ((s.resumeStep as RequesterStep) ?? "company"));`

        That branch existed to send a COMPLETED requester who had no
        `CompanyMembership` back into the wizard, because `CompanyStep` was the
        only UI in the codebase that could create one and it lived behind this
        line. ⚠ IT NOW POINTS AT A STEP THAT DOES NOT EXIST, and keeping it would
        strand exactly the people it was written to rescue: `indexOf` returns -1,
        no branch matches, and the wizard renders a blank screen.

        ⚠⚠ AND THE CONDITION IS NO LONGER A DEFECT TO CURE. Nobody gets a
        membership at registration any more, so "completed with no binding" is
        the NORMAL state of every requester — see `E418` on the transact gate,
        which no longer reads a membership either. A completed requester belongs
        on /ready, full stop.
      */
      if (s.completed) {
        router.replace("/join/requester/ready");
        return;
      }
      hydrate(s);
      /*
        ⚠ AN UNKNOWN STORED STEP FALLS BACK TO STEP 1 rather than rendering
        nothing. The nine rows stored on `company` were moved forward before the
        enum changed, so this should never fire — it is here because a resume
        point the wizard cannot match is a blank screen, and that failure mode
        should not depend on a data migration having been perfect.
      */
      const resume = s.resumeStep as RequesterStep;
      setStep(REQUESTER_STEPS.includes(resume) ? resume : REQUESTER_STEPS[0]);
      setReady(true);
    })();
  }, [router, hydrate]);

  const idx = REQUESTER_STEPS.indexOf(step);


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
    /*
      ⚠⚠ IT NOW SENDS THE WAY BACK (`P2-J1.1-E034`). ⚠ SUPERSEDED, quoted not
      deleted: `onSecondary: () => router.push("/dashboard")` — the whole button.
      It sent NOTHING, so "finish later" meant "hope you remember".

      SCOTT, 2026-09-06: *"These should be two separate emails. One is start your
      registration...the other is finish the registration you started (or saved
      for later)."* This is the click that sends the second one.

      ⚠ FIRE-AND-LEAVE, DELIBERATELY. The navigation does NOT wait on the send:
      the button's job is to get out of the wizard, and making that wait on an
      email round-trip would make leaving feel broken when mail is slow. The
      route is owner-scoped and idempotent, so nothing is lost by not awaiting.
      ⚠ A failed send must not trap the person here either — the `catch` is
      silent ON PURPOSE, and the route already logs the real reason.
      ⚠ THE DESTINATION IS UNCHANGED. `/dashboard` is where LEAVING goes; the
      EMAIL's button is what returns them to the wizard at their saved step.
    */
    onSecondary: () => {
      void fetch("/api/onboarding/requester/finish-later", { method: "POST" }).catch(
        () => {}
      );
      router.push("/dashboard");
    },
  };
  const nextLabel = `Next: ${LABELS[REQUESTER_STEPS[idx + 1] ?? "review"]}`;

  /*
    ── ⚠⚠ STEP 1 WAS `Which Company Do You Buy For?` AND IT IS GONE (`E418`) ───

    ⚠ SUPERSEDED, quoted not deleted — the screen removed here was 153 lines and
    carried, in its own words:
      · title *"Which Company Do You Buy For?"*, subtitle *"Your company is the
        legal entity every work order and settlement is between. Join it if it's
        already here, or add it and become its admin."*
      · an embedded `<CompanyStep bounded nameLabel="Employer Name *">` — the
        Find/Add tabs, the company search and the domain auto-attach;
      · a PENDING branch, *"Waiting on {company}."*, for a join awaiting a
        company admin's approval;
      · `if (companyValid || companyHasName) companySubmit.current?.();` — the
        three-state Continue that `P2-J1.1-E025` added after a part-answered
        company was silently thrown away.

    ⚠ ALL OF IT STAYS ON DISK IN `components/company/CompanyStep.tsx` (`E164`),
    unimported by this wizard, for work order acceptance to use.
  */

  // ---- 1/3 — Requester Information --------------------------------------
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
            /*
              ⚠⚠ SAVED IN E.164 SO THE COUNTRY TRAVELS WITH THE NUMBER (`E417`).
              Scott: *"The selected phone country is stored with the phone,
              independent of the address country."* There is no `phone_country`
              column and this brief forbids a `db:push`, so the country lives
              inside the value — `+966512345678`. ⚠ THE BOX STILL SHOWS THE
              NATIONAL FORM; only what is persisted changes.
              ⚠ FALLS BACK TO THE TYPED STRING if it cannot be made E.164, which
              `continueDisabled` has already ruled out — a save is never the
              place to silently drop what somebody typed.
            */
            phone: toE164(draft.phone, phoneCountry) ?? draft.phone,
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
          {/*
            ⚠ `Title *`, NOT `Job Title *` (`P2-J1.1-E007`, 2026-09-05). Scott
            asked for the change *"on CARD and in the question that solicits the
            value"*, so the review row and this label move together — a card that
            calls a thing one name and the question that collects it another is
            two names for one field.
            ⚠ SUPERSEDED, quoted not deleted: `label="Job Title *"`.
            ⚠ THE HINT AND PLACEHOLDER ARE UNTOUCHED. They still say *"role"* and
            *"Director of Procurement"*, which is the `E281` copy above and was
            not in scope.
          */}
          <Field
            label="Title *"
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
              onCountryChange={setPhoneCountry}
            />
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

  // ---- 2/3 — Work Location ----------------------------------------------
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

  // ---- 3/3 — Review ------------------------------------------------------
  const addr = (a: LocationValue) =>
    [a.line1, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ") ||
    "—";
  /*
    ── ⚠⚠ THE LABELS SAY WHAT THE FIELD IS (`P2-J1.1-E005`, `E006`, `E007`,
       2026-09-05) ───────────────────────────────────────────────────────────

    ⚠ SUPERSEDED, quoted not deleted: `Company` (`E005`), `Requester` (`E006`),
    `Job Title` (`E007`). Three label STRINGS changed. Nothing else did.

    ⚠⚠ `Employer` IS DISPLAY COPY OVER `Company`, AND THAT DISTINCTION IS
    LOAD-BEARING. The value is still `draft.companyName`, the Edit link still
    goes to the `company` step, the Prisma model is still `Company` — and
    `model Employer` ALREADY EXISTS in the schema as a different entity, the
    work-history employer that `P1-ALL-E373` made honest. Renaming anything in
    Prisma to match this word would collide with it. This is one string on one
    card.

    ⚠⚠ SUPERSEDED THE SAME DAY BY `P2-J1.1-E013` — quoted, not deleted:
    *"`Employee ID` KEEPS ITS NAME. It is the person's staff number
    (`draft.employeeId`) and not the employer."* ⚠ THE SECOND HALF OF THAT WAS
    WRONG, and the brief that fixed it says why: the column is the ERP USER ID —
    the POSR `User`/`UserId` extrinsic — not an HR staff number. The row is gone
    from this card entirely; see the block on the rows below.
  */
  const rows: { label: string; value: string; step: RequesterStep }[] = [
    /*
      ── ⚠ THE ORDER IS THE ORDER A PERSON WOULD SAY IT IN (`P2-J1.1-E008`) ────

      Name, Title, Employer, Work Location, Phone. Who you are, what you do, who
      you do it for, where you do it, and last the way to reach you.

      ⚠ FIVE ROWS, NOT SIX (`P2-J1.1-E013`, same day). ⚠ SUPERSEDED, quoted not
      deleted: *"Name, Title, Employer, Employee ID, Work Location, Phone… the
      number that identifies you there"*. `Employee ID` was removed from the UI
      because it is the requester's id IN THEIR OWN ERP, which arrives in a
      punchout request and is not something a person can type. ⚠ THE COLUMN, THE
      ZOD FIELD AND THE WRITE PATH ALL SURVIVE — a later punchout brief needs
      them, and `draft.employeeId` is still hydrated and still posted, so an
      existing value round-trips untouched rather than being blanked.

      ⚠ SUPERSEDED, quoted not deleted, the order this replaced:
        `Company · Requester · Job Title · Phone · Employee ID · Work Location`
      Phone sat third because it was typed third on the form. The form's order
      is a typing order; this card is a reading order, and they are allowed to
      differ.

      ⚠ A PURE REORDER OF LITERALS. Every `value` and every `step` travels with
      its own label — no field, link or lookup changed.
    */
    {
      label: "Name",
      value: `${draft.firstName} ${draft.lastName}`.trim() || "—",
      step: "requester_info",
    },
    /* `E281` — a required field belongs on the review. ⚠ ITS ORIGINAL REASONING
       IS SPENT, quoted not deleted: *"Employee ID is OPTIONAL and has always
       been listed, so omitting a REQUIRED one would be odd."* `E013` removed
       that row, so the comparison it drew no longer has a second term. Title
       stays on the card on its own merits — it is required and it is what a
       provider reads next to a name. */
    { label: "Title", value: draft.title || "—", step: "requester_info" },
    /*
      ⚠⚠ THE `Employer` ROW IS GONE (`P1-A1.4-E418`, 2026-09-11).

      ⚠ SUPERSEDED, quoted not deleted:
        `{ label: "Employer", value: draft.companyName || "—", step: "company" }`

      Its VALUE came from a question this wizard no longer asks and its EDIT LINK
      pointed at a step that no longer exists — the same two failures that
      retired the `Your Address` row below, and a row whose Edit goes nowhere is
      worse than no row. ⚠ THE `Company` RECORD IS NOT DELETED: the signup
      placeholder still exists on `Person.company_id`. Only the row is gone,
      because a provider learns who is asking at work order acceptance.
    */
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
    { label: "Phone", value: draft.phone || "—", step: "requester_info" },
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
