"use client";

import { useCallback, useEffect, useState } from "react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Field, Notice, TextArea, TextInput } from "@/components/onboarding/controls";
import { LegalLink } from "@/components/legal/LegalLink";
import { ReviewProfile, locParts, placeOf } from "@/components/onboarding/ReviewProfile";
import { BusinessTypePicker, type BT } from "@/components/company/BusinessTypePicker";
import { CompanyIdentityFields, findCoMatch, companyIdentityOk, emailOk, formatTin, type CoMatch } from "@/components/onboarding/CompanyIdentityFields";
import { LocationsBlock, locsProblem, newLoc, type LocRow } from "@/components/onboarding/LocationsBlock";
import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";
import { ResumeFirst } from "@/components/onboarding/ResumeFirst";
import { PersonFields, personComplete, type PersonValues } from "@/components/onboarding/PersonFields";
import { parseStoredPhone, toE164 } from "@/lib/phone";

// SO-E003: seller registration after Verify + the start page — Who Is Selling? · Company · Locations · Review, the buyer's shell and pieces.
// RF-E001 (Scott 10-17): Résumé · Seller · Company · Review — the résumé builds the searchable profile first.
export const SELLER_RAIL = [
  { key: "resume", label: "Résumé" },
  { key: "seller", label: "Seller" },
  { key: "company", label: "Company" },
];
const STEPS = ["resume", "seller", "company", "review"] as const;
type Step = (typeof STEPS)[number];
const DESCRIPTION_MAX = 600;
export const TIN_TAKEN = "A company with that Tax ID is already on Panameer. Check the number, or Message Support and we'll connect you.";

type Reg = {
  email: string;
  hasResume?: boolean;
  name?: string;
  seller: PersonValues;
  step: Step | null;
  registered: boolean;
  company: null | { status: "APPROVED" | "PENDING"; owner: boolean; id?: string; name: string; legalName?: string; tin?: string; website?: string; description?: string; companyEmail?: string; businessTypeIds?: string[] };
  locations: (LocRow & { id: string })[];
  own: (LocationValue & { line1?: string | null }) | null;
};

export function SellerRegistration({ onDone, onLeave }: { onDone: () => void; onLeave: () => void }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("resume");
  const [reached, setReached] = useState(0);
  const [person, setPerson] = useState<PersonValues>({ firstName: "", lastName: "", title: "", photoUrl: null, phone: "" });
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  const [reg, setReg] = useState<Reg | null>(null);
  const [name, setName] = useState("");
  // Scott 10-16: `name` = the legal Company Name; `dba` = the name they trade under (shown across Panameer when set).
  const [dba, setDba] = useState("");
  const [tin, setTin] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [remitEmail, setRemitEmail] = useState("");
  const [businessTypeId, setBusinessTypeId] = useState("");
  const [types, setTypes] = useState<BT[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [attestation, setAttestation] = useState(false);
  const [companyTos, setCompanyTos] = useState(false);
  const [match, setMatch] = useState<CoMatch>(null);
  const [askedAdmin, setAskedAdmin] = useState<string | null>(null);
  const [locs, setLocs] = useState<LocRow[]>([{ ...newLoc(null, true), billTo: false, shipTo: false }]);
  const [own, setOwn] = useState<LocationValue>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  // RF-E002: Continue needs a résumé read (or Skip for Now) and at least one kind of work.
  const [resumeOk, setResumeOk] = useState(false);
  // RF-E005: Review's Kind of Work — the roles ticked and how they work (from their capabilities).
  const [kow, setKow] = useState<{ roles: string[]; how: string } | null>(null);
  useEffect(() => {
    if (step !== "review") return;
    Promise.all([
      fetch("/api/onboarding/status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/provider/capabilities").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([st, caps]) => {
      const p = st?.profile ?? {};
      const names = new Map<string, string>(((p.roleTypes ?? []) as { id: string; display?: string; name: string }[]).map((r) => [r.id, r.display || r.name]));
      const modes = new Set<string>(((caps?.capabilities ?? []) as { mode: string }[]).map((c) => c.mode));
      const how = [modes.has("IMPLEMENT") && "I implement it", modes.has("SUPPORT") && "I support it", modes.has("OPERATE") && "I do the work"].filter(Boolean).join(" · ");
      setKow({ roles: ((p.roleTypeIds ?? []) as string[]).map((id) => names.get(id) ?? "").filter(Boolean), how });
    });
  }, [step]);
  const onResumeState = useCallback((x: { canContinue: boolean }) => setResumeOk(x.canContinue), []);

  const load = useCallback(async () => {
    const r: Reg | null = await fetch("/api/onboarding/provider/registration").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (!r) return null;
    setReg(r);
    if (r.hasResume) setImported(true);
    setPerson({ ...r.seller, phone: parseStoredPhone(r.seller.phone).display });
    setPhoneCountry((pc) => pc ?? parseStoredPhone(r.seller.phone).country ?? null);
    const c = r.company;
    if (c?.status === "APPROVED") {
      setName(c.legalName || c.name);
      setDba(c.legalName ? c.name : "");
      setTin(formatTin(c.tin ?? ""));
      setWebsite(c.website ?? "");
      setDescription(c.description ?? "");
      if (c.businessTypeIds?.[0]) setBusinessTypeId(c.businessTypeIds[0]);
    }
    // Prefilled like the buyer's: the company's email if it has one, else theirs.
    setRemitEmail((v) => v || (c?.status === "APPROVED" ? c.companyEmail : "") || r.email || "");
    if (r.locations.length) setLocs(r.locations);
    if (r.own) setOwn(r.own);
    return r;
  }, []);

  useEffect(() => {
    (async () => {
      const [r] = await Promise.all([
        load(),
        fetch("/api/company/industries").then((x) => (x.ok ? x.json() : {})).then((b: { businessTypes?: BT[]; commodities?: string[] }) => { setTypes(b.businessTypes ?? []); setCommodities(b.commodities ?? []); if (b.businessTypes?.length === 1) setBusinessTypeId((v) => v || b.businessTypes![0].id); }).catch(() => {}),
      ]);
      // Refresh returns to the step they were on (saved on the server), never past what's missing.
      const c = r?.company;
      const saved: Step = r?.step && STEPS.includes(r.step) ? r.step : "resume";
      const s: Step = saved === "review" && !c ? "company" : saved;
      setStep(s);
      setReached(STEPS.indexOf(s));
      if (!c) setMatch(await findCoMatch(""));
      setReady(true);
    })();
  }, [load]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    setReached((n) => Math.max(n, STEPS.indexOf(s)));
    void fetch("/api/onboarding/provider/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: s }) }).catch(() => {});
  };

  const post = async (url: string, method: string, body: object) => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; match?: { kind: string } };
    if (!r.ok) throw new Error(j.match?.kind === "tin" ? TIN_TAKEN : j.error ?? "Could not save that.");
  };

  if (!ready || !reg) return <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">Loading…</div>;

  const c = reg.company;
  const joining = c?.status === "PENDING";
  const owner = !!c?.owner;
  const idx = STEPS.indexOf(step);
  const shell = {
    rail: { steps: SELLER_RAIL, current: idx, reached, onPick: (i: number) => go(STEPS[i]) },
    eyebrow: `Step ${idx + 1} of ${STEPS.length} · ${step === "review" ? "Review" : SELLER_RAIL[idx].label}`,
    busy,
    canBack: idx > 0,
    onBack: idx > 0 ? () => go(STEPS[idx - 1]) : undefined,
    leaveLabel: "Finish later",
    onLeave,
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  // ---- Who Is Selling? (= the buyer's Who Is Buying?) ------------------------
  if (step === "seller") {
    const next = () => run(async () => {
      await post("/api/onboarding/provider/registration", "POST", { seller: { firstName: person.firstName, lastName: person.lastName, title: person.title, phone: toE164(person.phone, phoneCountry) ?? person.phone } });
      // RF-E003: the person's own work address (what the old Locations step saved for a non-owner).
      await post("/api/onboarding/provider/registration", "POST", { own: { line1: own.line1 ?? null, city: own.city ?? null, state: own.state ?? null, country: own.country ?? null } });
      await load();
      go("company");
    });
    return (
      <WizardShell
        {...shell}
        title="Who Is Selling?"
        subtitle="Add your photo and check what we filled in."
        continueLabel="Next: Company"
        continueDisabled={!personComplete(person, phoneCountry) || !own.country}
        onContinue={next}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-seller-person-step>
          {error && <Notice>{error}</Notice>}
          <PersonFields
            values={person}
            onChange={(patch) => setPerson((v) => ({ ...v, ...patch }))}
            phoneCountry={phoneCountry}
            onPhoneCountry={setPhoneCountry}
            titleHint="What you do, in one line — for example, Oracle Procurement Consultant."
            titlePlaceholder="Oracle Procurement Consultant"
            photoLine="Buyers see this next to your name on your profile and proposals. A clear headshot gets a faster response than an empty circle."
            photoFirst
            titleNote={imported && person.title ? "from your résumé — check it" : null}
            after={
              <div data-where-you-work>
                <p className="mb-2 text-[14px] font-bold">Where you work *</p>
                <LocationFields value={own} onChange={(p) => setOwn((o) => ({ ...o, ...p }))} compact />
              </div>
            }
          />
        </div>
      </WizardShell>
    );
  }

  // ---- Résumé (RF-E002): build the searchable profile first --------------------
  if (step === "resume") {
    return (
      <WizardShell
        {...shell}
        title="Build your profile from your résumé"
        subtitle="We read it and fill your profile. Check each section — this is what buyers search on."
        continueLabel="Next: Seller"
        continueDisabled={!resumeOk}
        onContinue={() => go("seller")}
        wide
      >
        <div className="w-full space-y-4" data-seller-resume-step>
          {error && <Notice>{error}</Notice>}
          <ResumeFirst hasResume={imported} onState={onResumeState} />
        </div>
      </WizardShell>
    );
  }

  // ---- Company -------------------------------------------------------------
  if (step === "company") {
    const requestAccess = () => run(async () => {
      if (!match) return;
      await post("/api/company/join", "POST", { companyId: match.id, attestation: true, matchedOn: match.byEmail ? "email" : "website" });
      setAskedAdmin(match.admin);
      setMatch(null);
      await load();
    });
    const shown = dba.trim() || name.trim();
    const next = () => run(async () => {
      if (match) return requestAccess();
      if (joining) return go("review");
      if (!c) {
        if (await findCoMatch(website).then((m) => (setMatch(m), m))) return;
        try {
          await post("/api/company/define", "POST", { name: shown, website: website.trim() || null, attestation, companyTos });
        } catch (e) {
          // A match that only shows now becomes Request Access, not a dead end.
          if (await findCoMatch(website).then((m) => (setMatch(m), m))) return;
          throw e;
        }
      } else if (owner && shown !== c.name) {
        await post("/api/company", "PATCH", { name: shown });
      }
      if (owner || !c) {
        await post("/api/company", "PATCH", { legalName: name.trim(), ...(tin.trim() ? { ein: tin.trim() } : {}), description: description.trim() || null, companyEmail: remitEmail.trim() || reg?.email || null });
        if (businessTypeId && !(c?.businessTypeIds ?? []).includes(businessTypeId)) await post("/api/company/business-types", "POST", { businessTypeId, on: true });
        // RF-E004: the company's addresses (at least one Remit To) live on this page now.
        await post("/api/company/locations", "POST", { locations: locs, seller: true });
      }
      await load();
      go("review");
    });
    const remitOk = emailOk(remitEmail.trim() || reg?.email || "");
    const locProblem = owner || !c ? locsProblem(locs, { buyer: false, seller: true }) : null;
    const ok = match || joining || (!locProblem && name.trim().length >= 2 && remitOk && companyIdentityOk({ website, tin }) && (!types.length || !!businessTypeId) && (c ? true : attestation && companyTos));
    return (
      <WizardShell
        {...shell}
        title="Which company do you sell through?"
        subtitle="Panameer contracts with and pays companies. A one-person business is a company too."
        continueLabel={match ? "Request Access" : "Next: Review"}
        continueDisabled={!ok}
        onContinue={next}
      >
        <div className="mx-auto w-full max-w-xl space-y-4" data-seller-company-step>
          <a href="/help/road#register" target="_blank" rel="noreferrer" className="-mt-2 inline-block text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Questions?</a>
          {error && <Notice>{error}</Notice>}
          <CompanyIdentityFields
            name={name}
            dba={dba}
            tin={tin}
            website={website}
            onChange={(p) => { setError(null); if (p.name !== undefined) setName(p.name); if (p.dba !== undefined) setDba(p.dba); if (p.tin !== undefined) setTin(p.tin); if (p.website !== undefined) { setWebsite(p.website); setMatch(null); } }}
            joining={joining}
            joinedName={c?.name ?? ""}
            match={match}
            askedAdmin={askedAdmin}
            busy={busy}
            onRequestAccess={() => void requestAccess()}
            onWebsiteBlur={() => void findCoMatch(website).then(setMatch)}
            waitNote="selling"
            nameSide={
              <Field label="Company Email *" hint="Where we send payment notices.">
                <TextInput type="email" value={remitEmail} onChange={(e) => setRemitEmail(e.target.value)} placeholder={reg?.email ?? ""} autoComplete="email" />
                {!remitOk && !!remitEmail.trim() && <span className="mt-1 block text-[13px] text-red-700">Enter an email like ap@acme.com</span>}
              </Field>
            }
          />
          {!joining && !match && (
            <div className="space-y-4">
              {types.length > 0 && (
                <BusinessTypePicker inline types={types} commodities={commodities} value={businessTypeId} onChange={setBusinessTypeId} hint="What your company sells. It sets up your Service Catalog; you can add more later." />
              )}
              <Field label="Description (optional)">
                <TextArea value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={`What the company does, in a sentence or two (up to ${DESCRIPTION_MAX} characters).`} className="min-h-0! h-[60px]" />
              </Field>
              {(owner || !c) && (
                <div data-seller-locations>
                  <p className="mb-2 text-[14px] font-bold">Company addresses *</p>
                  <LocationsBlock rows={locs} onChange={setLocs} buyer={false} seller />
                  {locProblem && <p className="mt-2 text-[13px] text-ink-2">{locProblem}</p>}
                </div>
              )}
              {!c && (
                <div className="divide-y divide-line border border-line">
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">I&apos;m authorized to represent this company on Panameer.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={companyTos} onChange={(e) => setCompanyTos(e.target.checked)} className="mt-1 h-4 w-4 accent-magenta" />
                    <span className="text-[14px] text-ink-2">On behalf of this company, I accept the Panameer <LegalLink href="/company-terms">Company Terms of Service</LegalLink>.</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </WizardShell>
    );
  }

  // ---- Review (Scott 10-16): the top of the profile, then Company and Locations — same component as the buyer ----
  const btName = types.find((t) => t.id === businessTypeId)?.name;
  const btGroup = types.find((t) => t.id === businessTypeId)?.group;
  const shown = dba.trim() || name.trim();
  const reviewLocs = owner ? locs.map((l) => locParts(l, { seller: true })) : [locParts(own, { seller: true, work: true })];
  const firstPlace = placeOf(owner ? locs[0] : own);
  return (
    <WizardShell
      {...shell}
      title="Here's how you'll look. Check it, then finish."
      subtitle="This is the top of the profile buyers see. Everything is editable later."
      continueLabel="Next: Dashboard"
      onContinue={() => run(async () => { await post("/api/onboarding/provider/registration", "POST", { complete: true }); onDone(); })}
    >
      {error && <div className="mx-auto mb-4 w-full max-w-2xl"><Notice>{error}</Notice></div>}
      <ReviewProfile
        person={{ ...person, email: reg.email }}
        companyLine={[joining ? c?.name : shown, placeOf(own) || firstPlace].filter(Boolean).join(" · ")}
        kindOfWork={kow ?? { roles: [], how: "" }}
        notLive
        companyRows={
          joining
            ? [{ label: "Company Name", value: `${c?.name ?? ""} (asked to join)` }]
            : [
                { label: "Company Name", value: name.trim() },
                { label: "DBA", value: dba.trim() },
                { label: "Company Email", value: `${remitEmail.trim() || reg.email} · payment notices` },
                { label: "Tax ID", value: tin.trim() },
                { label: "Business Type", value: [btGroup, btName].filter(Boolean).join(" › ") },
                { label: "Description", value: description.trim() },
              ]
        }
        locations={reviewLocs}
        next="On your Dashboard: Create What You Sell. Your résumé and skills, your rates and products, then enable your catalog (about 10 minutes)."
        onEdit={(sec) => go(sec === "work" ? "resume" : sec === "person" ? "seller" : "company")}
      />
    </WizardShell>
  );
}
