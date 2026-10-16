"use client";

import { useCallback, useEffect, useState } from "react";
import { countryName } from "@/lib/country";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { CompanyIdentityFields, findCoMatch, companyIdentityOk, type CoMatch } from "@/components/onboarding/CompanyIdentityFields";
import { LocationsBlock, locLine, locsProblem, newLoc, type LocRow } from "@/components/onboarding/LocationsBlock";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";
import { LegalLink } from "@/components/legal/LegalLink";
import { TIN_TAKEN } from "@/components/onboarding/SellerRegistration";
import { ReviewProfile, locParts, placeOf, type ReviewSection } from "@/components/onboarding/ReviewProfile";

const DESCRIPTION_MAX = 600;
import { parseStoredPhone, toE164 } from "@/lib/phone";
import { PersonFields, personComplete } from "@/components/onboarding/PersonFields";
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
  /** Scott 10-16: coName = the legal Company Name; coLegal now holds the DBA (shown across Panameer when set). */
  coLegal: string;
  coTin: string;
  coInvoiceEmail: string;
  coDescription: string;
  /** Scott 10-16: the seller's two checkboxes, same on the buyer side. */
  coAttest: boolean;
  coTos: boolean;
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
  coLegal: "",
  coTin: "",
  coInvoiceEmail: "",
  coDescription: "",
  coAttest: false,
  coTos: false,
  email: "",
  locMode: "none",
  locs: [],
  workIdx: 0,
  workAddressId: null,
  own: {},
};

type ServerLoc = LocRow & { id: string; siteId: string };


export default function RequesterStepsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<RequesterStep>(REQUESTER_STEPS[0]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [coMatch, setCoMatch] = useState<CoMatch>(null);
  const [askedAdmin, setAskedAdmin] = useState<string | null>(null);
  // Scott 10-15: furthest step reached (rail index; Review = number of work steps) — stays clickable.
  const [furthest, setFurthest] = useState(0);

  // BC-E005: the company already here for the website or the registrant's email domain.
  const checkMatch = useCallback(async (site: string): Promise<CoMatch> => {
    const m = await findCoMatch(site);
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
    company?: { bound?: boolean; name?: string | null; owner?: boolean; industryId?: string | null; legalName?: string | null; invoiceEmail?: string | null; description?: string | null; tin?: string | null } | null;
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
    {
      const r = s.resumeStep as string;
      const n = r === "review" ? REQUESTER_WORK_STEPS.length : REQUESTER_WORK_STEPS.indexOf(r as (typeof REQUESTER_WORK_STEPS)[number]);
      if (n >= 0) setFurthest((f) => Math.max(f, n));
    }
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
      coName: s.company?.bound ? s.company?.legalName || s.company?.name || "" : "",
      // LS-E004: keep the website they typed (the server never sends a pending joiner the company's).
      coWebsite: prev.coWebsite,
      companyOwner: !!s.company?.owner,
      coIndustryId: s.company?.industryId ?? "",
      coLegal: s.company?.legalName ? s.company?.name ?? "" : "",
      coTin: s.company?.tin ?? prev.coTin,
      coInvoiceEmail: s.company?.invoiceEmail ?? s.email ?? "",
      coDescription: s.company?.description ?? "",
      coAttest: prev.coAttest,
      coTos: prev.coTos,
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
    rail: { steps: railSteps, current: step === "review" ? railSteps.length : workIdx, reached: furthest, onPick: (i: number) => { setFromReview(false); setError(null); setStep(i >= REQUESTER_WORK_STEPS.length ? "review" : REQUESTER_WORK_STEPS[i]); } },
    // SO-E003: four steps on the rail (Review included), so "of 4".
    eyebrow: step === "review" ? `Step ${railSteps.length + 1} of ${railSteps.length + 1} · Review` : `Step ${workIdx + 1} of ${railSteps.length + 1} · ${REQUESTER_STEP_LABELS[step]}`,
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
        continueDisabled={!personComplete(draft, phoneCountry)}
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

          <PersonFields
            values={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            phoneCountry={phoneCountry}
            onPhoneCountry={setPhoneCountry}
            titleHint="Your role at your company — for example, Director of Procurement. Providers see it next to your name."
            titlePlaceholder="Director of Procurement"
            photoLine="Providers see this next to your name on a work request. A clear headshot gets a faster response than an empty circle."
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
    const shown = draft.coLegal.trim() || draft.coName.trim();
    const details = { legalName: draft.coName.trim() || null, industryId: draft.coIndustryId || null, invoiceEmail: draft.coInvoiceEmail.trim() || draft.email, description: draft.coDescription.trim() || null };
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
      const unchanged = draft.companyBound && shown === draft.companyName.trim() && !draft.coWebsite.trim();
      // Scott 10-15: a match found only now lights up Request Access; nothing else moves.
      if (!unchanged && (await checkMatch(draft.coWebsite))) return;
      if (!unchanged) {
        setBusy(true);
        setError(null);
        try {
          const site = draft.coWebsite.trim();
          const r = await fetch("/api/company/define", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: shown, website: site || null, attestation: draft.coAttest, companyTos: draft.coTos }) });
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
      if (draft.coTin.trim()) {
        // Scott 10-16: optional TIN, saved on the company; a TIN another company holds stops here.
        const r = await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ein: draft.coTin.trim() }) });
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          setError(b.match?.kind === "tin" ? TIN_TAKEN : b.error ?? "Could not save the Tax ID.");
          return;
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
        continueDisabled={coMatch ? false : joining ? false : draft.coName.trim().length < 2 || !emailOk || !companyIdentityOk({ website: draft.coWebsite, tin: draft.coTin }) || (!draft.companyBound && !(draft.coAttest && draft.coTos))}
        onContinue={submitCompany}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-buyer-company-step>
          <a href="/help/road#register" target="_blank" rel="noreferrer" className="-mt-2 inline-block text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Questions?</a>
          {error && <Notice>{error}</Notice>}
          {(
            <>
              <CompanyIdentityFields
                name={draft.coName}
                dba={draft.coLegal}
                tin={draft.coTin}
                website={draft.coWebsite}
                onChange={(p) => { if (p.website !== undefined) setCoMatch(null); edit({ ...(p.name !== undefined ? { coName: p.name } : {}), ...(p.dba !== undefined ? { coLegal: p.dba } : {}), ...(p.tin !== undefined ? { coTin: p.tin } : {}), ...(p.website !== undefined ? { coWebsite: p.website } : {}) }); }}
                joining={joining}
                joinedName={draft.companyName}
                match={coMatch}
                askedAdmin={askedAdmin}
                busy={busy}
                onRequestAccess={() => void askToJoin()}
                onWebsiteBlur={() => void checkMatch(draft.coWebsite)}
                waitNote="ordering"
                nameSide={
                  <Field label="Company Email *" hint="Where we send invoices.">
                    <TextInput type="email" value={draft.coInvoiceEmail} onChange={(e) => edit({ coInvoiceEmail: e.target.value })} placeholder={draft.email} autoComplete="email" />
                    {!emailOk && !!draft.coInvoiceEmail.trim() && <span className="mt-1 block text-[13px] text-red-700">Enter an email like ap@acme.com</span>}
                  </Field>
                }
              />
              {/* LS-E004: a joiner sees the company's name only — the rest isn't rendered. Scott 10-16: nor on a match. */}
              {!joining && !coMatch && (
              <div className="space-y-4">
              <div className="sm:w-1/2 sm:pr-1.5">
              <Field label="Industry">
                <select aria-label="Industry" value={draft.coIndustryId} onChange={(e) => edit({ coIndustryId: e.target.value })} className="h-11 w-full border border-line bg-surface px-3 text-[15px] text-ink">
                  <option value="">Choose…</option>
                  {industries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              </div>
              <Field label="Description (optional)">
                <TextArea value={draft.coDescription} maxLength={DESCRIPTION_MAX} onChange={(e) => edit({ coDescription: e.target.value })} rows={2} placeholder={`What the company does, in a sentence or two (up to ${DESCRIPTION_MAX} characters).`} className="min-h-0! h-[60px]" />
              </Field>
              {!draft.companyBound && (
                <div className="divide-y divide-line border border-line">
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={draft.coAttest} onChange={(e) => edit({ coAttest: e.target.checked })} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">I&apos;m authorized to represent this company on Panameer.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={draft.coTos} onChange={(e) => edit({ coTos: e.target.checked })} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">On behalf of this company, I accept the Panameer <LegalLink href="/company-terms">Company Terms of Service</LegalLink>.</span>
                  </label>
                </div>
              )}
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

  // ---- Review (Scott 10-16): the top of the profile, then Company and Locations — same component as the seller ----
  const shown = draft.coLegal.trim() || draft.coName.trim();
  const reviewLocs =
    draft.locMode === "owner"
      ? draft.locs.map((l, i) => locParts(l, { work: l.shipTo && i === draft.workIdx }))
      : draft.locMode === "member" && draft.workAddressId
        ? [locParts(draft.locs.find((l) => l.id === draft.workAddressId) ?? newLoc(), { work: true })]
        : [locParts(draft.own, { work: true })];
  const firstLoc = draft.locMode === "owner" ? draft.locs[draft.workIdx] ?? draft.locs[0] : draft.locMode === "member" && draft.workAddressId ? draft.locs.find((l) => l.id === draft.workAddressId) : draft.own;
  const editStep: Record<ReviewSection, RequesterStep> = { person: "requester_info", company: "company", locations: "work_location" };
  return (
    <WizardShell
      {...shell}
      title="Here's how you'll look. Check it, then finish."
      subtitle="This is what sellers see next to your name when you post work. Everything is editable later."
      continueLabel="Next: Dashboard"
      onContinue={finish}
    >
      {error && <div className="mx-auto mb-4 w-full max-w-2xl"><Notice>{error}</Notice></div>}
      <ReviewProfile
        person={{ firstName: draft.firstName, lastName: draft.lastName, title: draft.title, photoUrl: draft.photoUrl, phone: draft.phone, email: draft.email }}
        companyLine={[draft.companyOwner ? shown : draft.companyName, placeOf(firstLoc)].filter(Boolean).join(" · ")}
        companyRows={
          draft.companyOwner
            ? [
                { label: "Company Name", value: draft.coName.trim() },
                { label: "DBA", value: draft.coLegal.trim() },
                { label: "Company Email", value: `${draft.coInvoiceEmail.trim() || draft.email} · invoices` },
                { label: "Tax ID", value: draft.coTin.trim() },
                { label: "Industry", value: industries.find((x) => x.id === draft.coIndustryId)?.name ?? "" },
                { label: "Description", value: draft.coDescription.trim() },
              ]
            : [{ label: "Company Name", value: draft.companyName ? `${draft.companyName} (${draft.locMode === "pending" ? "asked to join" : "member"})` : "" }]
        }
        locations={reviewLocs}
        next="On your Dashboard: shop services and products, or post a job."
        onEdit={(sec) => { setFromReview(true); setStep(editStep[sec]); }}
      />
    </WizardShell>
  );
}
