"use client";

import { useCallback, useEffect, useState } from "react";
import { countryName } from "@/lib/country";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { Avatar } from "@/components/Avatar";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { isPhoneComplete, parseStoredPhone, toE164 } from "@/lib/phone";
import { REQUESTER_STEPS, REQUESTER_STEP_LABELS, REQUESTER_WORK_STEPS, type RequesterStep } from "@/lib/requester-steps";

const LABELS: Record<RequesterStep, string> = {
  requester_info: "Requester Information",
  work_location: "Work Location",
  review: "Review",
};

type Draft = {
  firstName: string;
  lastName: string;
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

  const [photoModal, setPhotoModal] = useState(false);

  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);

  const hydrate = useCallback((s: {
    emailVerified: boolean;
    completed: boolean;
    resumeStep: string;
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
      if (s.completed) {
        router.replace("/join/requester/ready");
        return;
      }
      hydrate(s);
      const resume = s.resumeStep as RequesterStep;
      setStep(REQUESTER_STEPS.includes(resume) ? resume : REQUESTER_STEPS[0]);
      setReady(true);
    })();
  }, [router, hydrate]);

  const idx = REQUESTER_STEPS.indexOf(step);

  const [fromReview, setFromReview] = useState(false);

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

  const back = fromReview
    ? () => {
        setFromReview(false);
        setStep("review");
      }
    : idx > 0
      ? () => setStep(REQUESTER_STEPS[idx - 1])
      : undefined;
  // Onboarding frame: rail of the work steps + Review (unnumbered), eyebrow from the same list.
  const railSteps = REQUESTER_WORK_STEPS.map((k) => ({ key: k, label: REQUESTER_STEP_LABELS[k] }));
  const workIdx = REQUESTER_WORK_STEPS.indexOf(step as (typeof REQUESTER_WORK_STEPS)[number]);
  const shell = {
    rail: { steps: railSteps, current: step === "review" ? railSteps.length : workIdx },
    eyebrow: step === "review" ? "Review" : `Step ${workIdx + 1} of ${railSteps.length} · ${REQUESTER_STEP_LABELS[step]}`,
    busy,
    onBack: back,
    canBack: fromReview || idx > 0,
    leaveLabel: "Finish later",
    onLeave: () => {
      void fetch("/api/onboarding/requester/finish-later", { method: "POST" }).catch(
        () => {}
      );
      router.push("/dashboard");
    },
  };
  const nextLabel = fromReview
    ? "Save & Return to Review"
    : `Next: ${REQUESTER_STEP_LABELS[REQUESTER_STEPS[idx + 1] ?? "review"]}`;

  // STEP 1 WAS `Which Company Do You Buy For?` AND IT IS GONE

  // ---- 1/3 — Requester Information --------------------------------------
  if (step === "requester_info") {
    return (
      <WizardShell
        {...shell}
        title="Who's asking for the work?"
        subtitle="This is the person on the request — the contact a provider sees, and the identity your ERP sends if you connect one later."
        continueLabel={nextLabel}
        // THE GATE IS FIRST + LAST + A COMPLETE PHONE, AND THAT IS TWO BRIEF
        continueDisabled={
          !draft.firstName.trim() ||
          !draft.lastName.trim() ||
          // — photo AND title are REQUIRED, per Scott: *"The requester
          !draft.photoUrl ||
          !draft.title.trim() ||
          !isPhoneComplete(draft.phone, phoneCountry)
        }
        // `save(payload, "review")` is the entire behaviour Scott
        onContinue={() =>
          save({
            firstName: draft.firstName,
            lastName: draft.lastName,
            /* `E281`. NO `photoUrl` — `/api/profile/photo` already wrote it. */
            title: draft.title,
            // SAVED IN E.164 SO THE COUNTRY TRAVELS WITH THE NUMBER .
            phone: toE164(draft.phone, phoneCountry) ?? draft.phone,
            employeeId: draft.employeeId,
            // it is gone, so re-sending the hydrated copy would rewrite the
          }, fromReview ? "review" : undefined)
        }
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}

          {/* THE PROVIDER'S OWN UPLOADER, REUSED */}
          <div className="flex flex-col items-center gap-5 border border-line p-6 sm:flex-row sm:items-center sm:text-left">
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
                className="mt-3 border border-ink bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover"
              >
                {draft.photoUrl ? "Change Photo" : "Add a Photo"}
              </button>
            </div>
          </div>

          {/* A ROLE, NOT A SALES HEADLINE . Same `Person.title` column */}
          {/* asked for the change *"on CARD and in the question that solicits the */}
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

          {/* FULL WIDTH SINCE , and measured in the walk rather */}
          <div className="grid gap-3">
            {/* THE BUILT VALIDATOR, NOT A RAW INPUT . This was a plain */}
            <PhoneField
              value={draft.phone}
              onChange={(next) => setDraft((d) => ({ ...d, phone: next }))}
              country={phoneCountry}
              onCountryChange={setPhoneCountry}
            />
          </div>

          {/* THE SHARED MODAL. `onUploaded` fires only after the server has */}
          <PhotoCropModal
            open={photoModal}
            onClose={() => setPhotoModal(false)}
            onUploaded={(photoUrl) => setDraft((d) => ({ ...d, photoUrl }))}
          />

          {/* THE `Your address` BLOCK STOOD HERE AND IS GONE . */}
        </div>
      </WizardShell>
    );
  }

  // THE `buyer_approver` SCREEN STOOD HERE AND IS GONE .

  // ---- 2/3 — Work Location ----------------------------------------------
  if (step === "work_location") {
    // THIS FALLBACK IS NOT A PRE-FILL ANY MORE , 2026-08-30).
    const wl = draft.workLocationSet ? draft.workLocation : draft.address;
    return (
      <WizardShell
        {...shell}
        title="Where does the work happen?"
        // NO SUBTITLE, AND THAT IS SCOTT'S ANSWER, NOT AN OMISSION .
        continueLabel={nextLabel}
        continueDisabled={!wl.country}
        onContinue={() => save({ workLocation: wl }, fromReview ? "review" : undefined)}
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}

          {/* THE "Pre-filled from your address" NOTICE IS GONE . */}

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
    // RESOLVED ( WS-C ruling 4) — `a.country` is the form draft, which holds a CODE
    [a.line1, a.city, a.state, a.postalCode, countryName(a.country, a.country)]
      .filter(Boolean)
      .join(", ") ||
    "—";
  // THE LABELS SAY WHAT THE FIELD IS , , 
  const rows: { label: string; value: string; step: RequesterStep }[] = [
    // THE ORDER IS THE ORDER A PERSON WOULD SAY IT IN
    {
      label: "Name",
      value: `${draft.firstName} ${draft.lastName}`.trim() || "—",
      step: "requester_info",
    },
    // — a required field belongs on the review. ITS ORIGINAL REASONING
    { label: "Title", value: draft.title || "—", step: "requester_info" },
    // THE `Employer` ROW IS GONE , 2026-09-11).
    // THE `Your Address` ROW IS GONE , 2026-08-30).
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
      title="Here's your profile. Check it, then finish."
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
        <dl className="overflow-hidden border border-line">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex flex-wrap items-baseline gap-3 border-b border-line px-5 py-4 last:border-0"
            >
              <dt className="w-40 shrink-0 text-[13.5px] font-bold uppercase tracking-wide text-ink-2">
                {r.label}
              </dt>
              <dd className="min-w-0 flex-1 text-[15.5px]">{r.value}</dd>
              {/* THE EDIT JUMPED TO THE STEP AND REMEMBERED NOTHING . */}
              <button
                type="button"
                onClick={() => {
                  setFromReview(true);
                  setStep(r.step);
                }}
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
