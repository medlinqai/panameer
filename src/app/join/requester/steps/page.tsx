"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { CompanyStep, type CompanyOutcome } from "@/components/company/CompanyStep";
import { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";

/**
 * The REQUESTER wizard — five steps on the provider's shell (P1-J1.2 WS2).
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

const LABELS: Record<RequesterStep, string> = {
  company: "Your Company",
  requester_info: "Requester Information",
  buyer_approver: "Buyer & Approver",
  work_location: "Work Location",
  review: "Review",
};

type Draft = {
  companyId: string | null;
  companyName: string;
  firstName: string;
  lastName: string;
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

  const hydrate = useCallback((s: {
    emailVerified: boolean;
    completed: boolean;
    resumeStep: string;
    profile: {
      firstName: string; lastName: string; phone: string | null;
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
    const companyAnswered =
      REQUESTER_STEPS.indexOf(s.resumeStep as RequesterStep) >
      REQUESTER_STEPS.indexOf("company");
    const companyName = companyAnswered ? (p.companyName ?? "") : "";

    setDraft({
      companyId: null,
      companyName,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
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
      if (s.completed) {
        router.replace("/join/requester/ready");
        return;
      }
      hydrate(s);
      setStep((s.resumeStep as RequesterStep) ?? "company");
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
  const shell = {
    step: idx + 1,
    totalSteps: REQUESTER_STEPS.length,
    stepLabel: LABELS[step],
    busy,
    onBack: back,
    canBack: idx > 0,
  };
  const nextLabel = `Next: ${LABELS[REQUESTER_STEPS[idx + 1] ?? "review"]}`;

  // ---- 1/5 — Company ----------------------------------------------------
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
        title="Which company do you buy for?"
        subtitle="Your company is the legal entity every work order and settlement is between. Join it if it's already here, or add it and become its admin."
        continueLabel={nextLabel}
        continueDisabled={!companyValid}
        busy={busy || companyBusy}
        onContinue={() => companySubmit.current?.()}
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

  // ---- 2/5 — Requester Information --------------------------------------
  if (step === "requester_info") {
    return (
      <WizardShell
        {...shell}
        title="Tell us who you are."
        subtitle="This is the person on the request — the contact a provider sees, and the identity your ERP sends if you connect one later."
        continueLabel={nextLabel}
        continueDisabled={
          !draft.firstName.trim() || !draft.lastName.trim() || !draft.address.country
        }
        onContinue={() =>
          save({
            firstName: draft.firstName,
            lastName: draft.lastName,
            phone: draft.phone,
            employeeId: draft.employeeId,
            address: draft.address,
          })
        }
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}
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
            <Field label="Phone">
              <TextInput
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                autoComplete="tel"
                placeholder="+1 555 010 4477"
              />
            </Field>
            <Field
              label="Employee ID"
              hint="Your id in your own system. Optional — it's what links you to your ERP later."
            >
              <TextInput
                value={draft.employeeId}
                onChange={(e) => setDraft((d) => ({ ...d, employeeId: e.target.value }))}
              />
            </Field>
          </div>

          <div className="pt-2">
            <p className="mb-3 text-[14px] font-bold">Your address</p>
            <div className="space-y-3">
              <LocationFields
                value={draft.address}
                onChange={(patch) =>
                  setDraft((d) => ({ ...d, address: { ...d.address, ...patch } }))
                }
                withStreet
              />
            </div>
          </div>
        </div>
      </WizardShell>
    );
  }

  // ---- 3/5 — Buyer & Approver -------------------------------------------
  if (step === "buyer_approver") {
    return (
      <WizardShell
        {...shell}
        title="Who buys with you, and who approves?"
        subtitle="One named approver is enough to start. Approval chains and spend thresholds are set up on the company later."
        continueLabel={nextLabel}
        continueDisabled={!draft.approverName.trim()}
        onContinue={() =>
          save({
            buyerName: draft.buyerName,
            buyerEmail: draft.buyerEmail,
            approverName: draft.approverName,
            approverEmail: draft.approverEmail,
          })
        }
      >
        <div className="mx-auto w-full max-w-xl space-y-6">
          {error && <Notice>{error}</Notice>}

          <section>
            <p className="mb-3 text-[14px] font-bold">
              Your buyer{" "}
              <span className="font-medium text-ink-2">
                — the person who supports your buying
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <TextInput
                  value={draft.buyerName}
                  onChange={(e) => setDraft((d) => ({ ...d, buyerName: e.target.value }))}
                />
              </Field>
              <Field label="Work Email">
                <TextInput
                  type="email"
                  value={draft.buyerEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, buyerEmail: e.target.value }))}
                  placeholder="buyer@company.com"
                />
              </Field>
            </div>
          </section>

          <section>
            <p className="mb-3 text-[14px] font-bold">
              Your approver{" "}
              <span className="font-medium text-ink-2">
                — who signs off on the work
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *">
                <TextInput
                  value={draft.approverName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, approverName: e.target.value }))
                  }
                />
              </Field>
              <Field label="Work Email">
                <TextInput
                  type="email"
                  value={draft.approverEmail}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, approverEmail: e.target.value }))
                  }
                  placeholder="approver@company.com"
                />
              </Field>
            </div>
            <p className="mt-2 text-[13.5px] text-ink-2">
              We record the name now. Nothing is sent to them yet — routing
              approvals is a later step.
            </p>
          </section>
        </div>
      </WizardShell>
    );
  }

  // ---- 4/5 — Work Location ----------------------------------------------
  if (step === "work_location") {
    const wl = draft.workLocationSet ? draft.workLocation : draft.address;
    const sameAsYours =
      !draft.workLocationSet ||
      JSON.stringify(draft.workLocation) === JSON.stringify(draft.address);
    return (
      <WizardShell
        {...shell}
        title="Where does the work happen?"
        subtitle="The deliver-to for your engagements. It starts as your own address — change it if the work lands somewhere else."
        continueLabel={nextLabel}
        continueDisabled={!wl.country}
        onContinue={() => save({ workLocation: wl })}
      >
        <div className="mx-auto w-full max-w-xl space-y-4">
          {error && <Notice>{error}</Notice>}

          {sameAsYours && (
            <Notice tone="info">
              Pre-filled from your address. Edit any field to make it different.
            </Notice>
          )}

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

  // ---- 5/5 — Review ------------------------------------------------------
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
    { label: "Phone", value: draft.phone || "—", step: "requester_info" },
    { label: "Employee ID", value: draft.employeeId || "—", step: "requester_info" },
    { label: "Your address", value: addr(draft.address), step: "requester_info" },
    {
      label: "Buyer",
      value:
        [draft.buyerName, draft.buyerEmail].filter(Boolean).join(" · ") || "—",
      step: "buyer_approver",
    },
    {
      label: "Approver",
      value:
        [draft.approverName, draft.approverEmail].filter(Boolean).join(" · ") || "—",
      step: "buyer_approver",
    },
    {
      label: "Work location",
      value: addr(draft.workLocationSet ? draft.workLocation : draft.address),
      step: "work_location",
    },
  ];

  return (
    <WizardShell
      {...shell}
      title="Check this over."
      subtitle="Everything here is editable later — this is the shape a provider sees when you post work."
      continueLabel="I'm Ready to Post Work"
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
