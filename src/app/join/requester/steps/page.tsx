"use client";
import Link from "next/link";

import { useCallback, useEffect, useState } from "react";
import { countryName } from "@/lib/country";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { LocationsBlock, locLine, locsProblem, newLoc, type LocRow } from "@/components/onboarding/LocationsBlock";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { Avatar } from "@/components/Avatar";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { isPhoneComplete, parseStoredPhone, toE164 } from "@/lib/phone";
import { REQUESTER_STEPS, REQUESTER_STEP_LABELS, REQUESTER_WORK_STEPS, type RequesterStep } from "@/lib/requester-steps";

const LABELS: Record<RequesterStep, string> = {
  requester_info: "Buyer Information",
  company: "Company",
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
  /** BR-E002: the company on file (name), and the Company step's inputs. */
  companyName: string;
  companyBound: boolean;
  coName: string;
  coWebsite: string;
  /** BC-E002: the company's industry, one address and invoice email (owner only). */
  companyOwner: boolean;
  coIndustryId: string;
  coInvoiceEmail: string;
  email: string;
  /** LS-E003: owner edits the company's addresses; member picks one (or their own); pending joiner enters their own. */
  locMode: "owner" | "member" | "pending" | "none";
  locs: LocRow[];
  workIdx: number;
  workAddressId: string | null;
  own: LocationValue;
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
  companyName: "",
  companyBound: false,
  coName: "",
  coWebsite: "",
  companyOwner: false,
  coIndustryId: "",
  coInvoiceEmail: "",
  email: "",
  locMode: "none",
  locs: [],
  workIdx: 0,
  workAddressId: null,
  own: {},
};

type ServerLoc = LocRow & { id: string; siteId: string };

type CoMatch = { id: string; name: string; why: string; byEmail: boolean; admin: string | null } | null;

export default function RequesterStepsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<RequesterStep>(REQUESTER_STEPS[0]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoModal, setPhotoModal] = useState(false);

  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [coMatch, setCoMatch] = useState<CoMatch>(null);
  const [askedAdmin, setAskedAdmin] = useState<string | null>(null);

  // BC-E005: the company already here for the website or the registrant's email domain.
  const checkMatch = useCallback(async (site: string): Promise<CoMatch> => {
    const b = await fetch(`/api/company/match?email=1&site=${encodeURIComponent(site.trim())}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const m = b?.match ? { id: b.match.id as string, name: b.match.name as string, byEmail: b.reason === "email", why: b.reason === "email" ? `your email is @${b.domain}` : `its website is ${b.domain}`, admin: (b.match.adminName as string | null) ?? null } : null;
    setCoMatch(m);
    return m;
  }, []);

  useEffect(() => {
    fetch("/api/company/industries").then((r) => (r.ok ? r.json() : { industries: [] })).then((b) => setIndustries(b.industries ?? [])).catch(() => {});
  }, []);

  const hydrate = useCallback((s: {
    emailVerified: boolean;
    completed: boolean;
    resumeStep: string;
    email?: string;
    company?: { bound?: boolean; name?: string | null; owner?: boolean; industryId?: string | null; invoiceEmail?: string | null } | null;
    locations?: { mode: Draft["locMode"]; addresses: ServerLoc[]; workAddressId: string | null; own: LocationValue | null };
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

    const L = s.locations ?? { mode: "none" as const, addresses: [], workAddressId: null, own: null };
    const workIdx = Math.max(0, L.addresses.findIndex((a) => a.id === L.workAddressId));
    setDraft((prev) => ({
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
      companyName: s.company?.bound ? s.company?.name ?? "" : "",
      companyBound: !!s.company?.bound,
      coName: s.company?.bound ? s.company?.name ?? "" : "",
      // LS-E004: keep the website they typed (the server never sends a pending joiner the company's).
      coWebsite: prev.coWebsite,
      companyOwner: !!s.company?.owner,
      coIndustryId: s.company?.industryId ?? "",
      coInvoiceEmail: s.company?.invoiceEmail ?? s.email ?? "",
      email: s.email ?? "",
      locMode: L.mode,
      // The first address arrives with every use ticked.
      locs: L.addresses.length ? L.addresses : [newLoc(p.address?.country)],
      workIdx,
      workAddressId: L.workAddressId ?? (L.own?.line1 ? null : L.addresses.find((a) => a.shipTo)?.id ?? null),
      own: L.own ?? { country: p.address?.country ?? undefined },
    }));
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
      if (!s.company?.bound) void checkMatch("");
      const resume = s.resumeStep as RequesterStep;
      setStep(REQUESTER_STEPS.includes(resume) ? resume : REQUESTER_STEPS[0]);
      setReady(true);
    })();
  }, [router, hydrate, checkMatch]);

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
        title="Who Is Buying?"
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

          {/* Scott 10-15: no résumé at buyer registration — it filled things the buyer can't see here. It stays on the Buyer Profile editor. */}

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

  // ---- 2/3 — Company (BC-E002): name · website · industry · one address · invoice email; joining skips the details ----
  if (step === "company") {
    const joining = draft.companyBound && !draft.companyOwner;
    const details = { industryId: draft.coIndustryId || null, invoiceEmail: draft.coInvoiceEmail.trim() || draft.email };
    const after = fromReview ? "review" : undefined;
    const askToJoin = async () => {
      if (!coMatch) return;
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/company/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: coMatch.id, attestation: true, matchedOn: coMatch.byEmail ? "email" : "website" }) });
        const b = await r.json().catch(() => ({}));
        if (!r.ok) { setError(b.error ?? "Could not send your request."); return; }
      } finally {
        setBusy(false);
      }
      setAskedAdmin(coMatch.admin);
      setCoMatch(null);
      // Stay on the step so they see who was asked; Next carries on to Location.
      await save({ companyBound: true });
    };
    const submitCompany = async () => {
      if (coMatch) return askToJoin();
      if (joining) return save({ companyBound: true }, after);
      const unchanged = draft.companyBound && draft.coName.trim() === draft.companyName.trim() && !draft.coWebsite.trim();
      // Scott 10-15: a match found only now lights up Request Access; nothing else moves.
      if (!unchanged && (await checkMatch(draft.coWebsite))) return;
      if (!unchanged) {
        setBusy(true);
        setError(null);
        try {
          const site = draft.coWebsite.trim();
          const r = await fetch("/api/company/define", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.coName.trim(), website: site || null, attestation: true, companyTos: true }) });
          const b = await r.json().catch(() => ({}));
          if (!r.ok) {
            // A match that only shows now becomes Ask to Join, not a dead end.
            if (!(await checkMatch(site))) setError(b.error ?? "Could not save your company.");
            return;
          }
        } finally {
          setBusy(false);
        }
      }
      await save({ companyBound: true, companyDetails: details }, after);
    };
    const edit = (patch: Partial<Draft>) => { setError(null); setDraft((d) => ({ ...d, ...patch })); };
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.coInvoiceEmail.trim() || draft.email);
    return (
      <WizardShell
        {...shell}
        title="Which company are you buying for?"
        subtitle="Your company's details, entered once. Its addresses come next."
        continueLabel={nextLabel}
        continueDisabled={coMatch ? false : joining ? false : draft.coName.trim().length < 2 || !emailOk}
        onContinue={submitCompany}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-buyer-company-step>
          {error && <Notice>{error}</Notice>}
          {(
            <>
              <div className="space-y-3">
              <Field label="Company Name *">
                <TextInput value={joining ? draft.companyName : draft.coName} onChange={(e) => edit({ coName: e.target.value })} autoComplete="organization" placeholder="Acme Manufacturing" className="sm:max-w-[50%]" disabled={joining} />
              </Field>
              <Field label="Website">
                <div className="flex gap-2">
                  <TextInput value={draft.coWebsite} onChange={(e) => { edit({ coWebsite: e.target.value }); setCoMatch(null); }} className="sm:max-w-[50%]" disabled={joining} onBlur={() => { if (draft.coWebsite.trim()) void checkMatch(draft.coWebsite); }} placeholder="acme.com" autoComplete="url" />
                  <button type="button" data-request-access disabled={!coMatch || busy} onClick={() => void askToJoin()} className="shrink-0 bg-ink px-4 text-[13.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-30">{joining ? "Requested ✓" : "Request Access"}</button>
                </div>
              </Field>
              </div>
              {joining && (
            <div data-join-requested className="border border-line bg-white p-4 text-[14px]">
              <p>Request sent. We asked {askedAdmin ? <b>{askedAdmin}</b> : "the admin"} at <b>{draft.companyName}</b> to approve you, and we&apos;ll email you when they do. Keep going while you wait; ordering opens once they approve.</p>
              <p className="mt-2 text-[13px] text-ink-2">Wrong person, or not your company? <Link href="/support/bug" className="font-semibold text-magenta-dark underline underline-offset-4">Message Support</Link></p>
            </div>
              )}
              {coMatch && (
                <p data-company-match className="-mt-1 border-l-2 border-magenta pl-3 text-[13px] text-ink-2">
                  <b className="text-ink">{coMatch.name}</b> is already on Panameer ({coMatch.why}). <b>Request Access</b> and we&apos;ll ask {coMatch.admin ? <b className="text-ink">{coMatch.admin}</b> : "its admin"} to approve you. You can keep going while you wait.
                </p>
              )}
              {/* LS-E004: a joiner sees the company's name only — the rest isn't rendered. */}
              {!joining && (
              <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Industry">
                <select aria-label="Industry" value={draft.coIndustryId} onChange={(e) => edit({ coIndustryId: e.target.value })} className="h-11 w-full border border-line bg-surface px-3 text-[15px] text-ink">
                  <option value="">Choose…</option>
                  {industries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Invoice Email *">
                <TextInput type="email" value={draft.coInvoiceEmail} onChange={(e) => edit({ coInvoiceEmail: e.target.value })} placeholder={draft.email} autoComplete="email" />
              </Field>
              </div>
              <p className="text-[12.5px] text-ink-2">By continuing you confirm you can add this company and accept the company terms. No tax ID or W-9 is needed to buy.</p>
              </div>
              )}
            </>
          )}
        </div>
      </WizardShell>
    );
  }

  // ---- 3/3 — Locations (LS-E003/E004): the company's addresses with their uses; joiners enter their own ----
  if (step === "work_location") {
    const after = fromReview ? "review" : undefined;
    const ownOk = !!draft.own.line1?.trim() && !!draft.own.country;
    const ships = draft.locs.map((l, i) => (l.shipTo ? i : -1)).filter((i) => i >= 0);
    const problem =
      draft.locMode === "owner" ? locsProblem(draft.locs, { buyer: true }) :
      draft.locMode === "member" ? (draft.workAddressId ? null : ownOk ? null : "Pick where you work, or enter it") :
      ownOk ? null : "Add the country and street";
    const onContinue = () => {
      if (draft.locMode === "owner") return save({ locations: draft.locs, workIndex: ships.includes(draft.workIdx) ? draft.workIdx : ships[0] }, after);
      if (draft.locMode === "member" && draft.workAddressId) return save({ workAddressId: draft.workAddressId }, after);
      return save({ workLocation: draft.own }, after);
    };
    const ownFields = (
      <div data-own-address className="border border-line p-4">
        <p className="mb-2 text-[14px] font-bold">Where you work *</p>
        <LocationFields value={draft.own} onChange={(patch) => setDraft((d) => ({ ...d, own: { ...d.own, ...patch } }))} withStreet compact />
      </div>
    );
    return (
      <WizardShell
        {...shell}
        title={draft.locMode === "owner" ? "Where is your company?" : "Where does the work happen?"}
        subtitle={draft.locMode === "owner" ? "Tick what each address is for. You need at least one Bill To and one Ship To." : draft.locMode === "pending" ? "Your own work address for now. Once you're approved you can switch to one of your company's addresses." : undefined}
        continueLabel={nextLabel}
        continueDisabled={!!problem}
        onContinue={onContinue}
      >
        <div className="mx-auto w-full max-w-2xl space-y-4" data-locations-step={draft.locMode}>
          {error && <Notice>{error}</Notice>}
          {draft.locMode === "owner" ? (
            <LocationsBlock rows={draft.locs} onChange={(locs) => setDraft((d) => ({ ...d, locs }))} work={draft.workIdx} onWork={(i) => setDraft((d) => ({ ...d, workIdx: i }))} />
          ) : draft.locMode === "member" ? (
            <div className="space-y-2" role="radiogroup" aria-label="Where you work">
              {draft.locs.filter((l) => l.shipTo && l.id).map((l) => (
                <label key={l.id!} className="flex cursor-pointer items-center gap-3 border border-line p-3 text-[14.5px]">
                  <input type="radio" name="work-address" checked={draft.workAddressId === l.id} onChange={() => setDraft((d) => ({ ...d, workAddressId: l.id! }))} className="h-4 w-4 accent-magenta" />
                  {locLine(l)}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 border border-line p-3 text-[14.5px]">
                <input type="radio" name="work-address" checked={!draft.workAddressId} onChange={() => setDraft((d) => ({ ...d, workAddressId: null }))} className="h-4 w-4 accent-magenta" />
                Somewhere else
              </label>
              {!draft.workAddressId && ownFields}
            </div>
          ) : (
            ownFields
          )}
          {problem && draft.locMode === "owner" && <p className="text-[13px] text-ink-2">{problem}</p>}
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
    // LS-E006: Company = name · industry · invoice email; a Locations row per address with its uses.
    {
      label: "Company",
      value: draft.companyOwner
        ? [draft.companyName, industries.find((x) => x.id === draft.coIndustryId)?.name, draft.coInvoiceEmail || draft.email].filter(Boolean).join(" · ")
        : draft.companyName ? `${draft.companyName} (${draft.locMode === "pending" ? "asked to join" : "member"})` : "—",
      step: "company",
    },
    ...(draft.locMode === "owner"
      ? draft.locs.map((l, i) => ({ label: draft.locs.length > 1 ? `Location ${i + 1}` : "Location", value: locLine(l, { work: l.shipTo && i === draft.workIdx }), step: "work_location" as RequesterStep }))
      : draft.locMode === "member" && draft.workAddressId
        ? [{ label: "Location", value: locLine(draft.locs.find((l) => l.id === draft.workAddressId) ?? newLoc(), { work: true }), step: "work_location" as RequesterStep }]
        : [{ label: "Location", value: `${addr(draft.own)} · Where I work`, step: "work_location" as RequesterStep }]),
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
