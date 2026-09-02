"use client";

import { useEffect, useRef, useState } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import { Field, TextInput, Notice, OptionCard } from "@/components/onboarding/controls";
import { COUNTRIES } from "@/lib/countries";
import {
  LocationFields,
  type LocationValue,
} from "@/components/onboarding/LocationFields";
import {
  EIN_MESSAGE,
  US_ZIP_MESSAGE,
  ein as einFormat,
  isUnitedStates,
  usZip,
} from "@/lib/field-formats";
import {
  SUPPORTED_STATES,
  US_STATES,
  type ValidationResult,
} from "@/lib/company-validation";

/**
 * DEFINE OR JOIN — the company building block, shared by BOTH onboarding tracks
 * (brief_company_model WS2 + WS5).
 *
 * One component because it is one question. The buyer side asks it as step 1 of
 * the requester wizard and the seller side asks it inside the provider wizard;
 * two implementations would be two places for the attestation, the ToS record
 * and the domain rule to drift, and those three are the whole point.
 *
 * WHAT IT REPLACES: a plain pick-from-list that attached anyone to any company
 * with no check at all. Now every path through it produces a recorded decision —
 * define (you become the admin, you accept the company terms), join with a
 * matching work domain (auto-approved), or join without one (a request your
 * would-be admin approves).
 *
 * EVERY PROVIDER AND BUYER IS A COMPANY. A sole proprietor picks "Sole
 * Proprietor / Individual" as the tax type and is a company of one — there is
 * deliberately no separate individual path, because the tax type is what the
 * payout gate reads for SSN-vs-EIN and 1099-reportability.
 */

export type TaxTypeValue =
  | "C_CORP"
  | "S_CORP"
  | "LLC"
  | "PARTNERSHIP"
  | "SOLE_PROP_INDIVIDUAL"
  | "NONPROFIT";

const TAX_TYPES: { value: TaxTypeValue; label: string; hint?: string }[] = [
  { value: "SOLE_PROP_INDIVIDUAL", label: "Sole Proprietor / Individual", hint: "Just me — a company of one" },
  { value: "LLC", label: "LLC" },
  { value: "S_CORP", label: "S-Corporation" },
  { value: "C_CORP", label: "C-Corporation" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "NONPROFIT", label: "Non-profit" },
];

export type CompanyHit = {
  id: string;
  name: string;
  domain: string | null;
  members: number;
};

export type CompanyOutcome = {
  companyId: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  autoApproved?: boolean;
};

const SELECT =
  "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

export function CompanyStep({
  onDone,
  onBusyChange,
  submitRef,
  onValidityChange,
  bounded = false,
  suggestedName = null,
}: {
  onDone: (outcome: CompanyOutcome) => void;
  onBusyChange?: (busy: boolean) => void;
  /**
   * The wizard owns the Continue button, so it needs a handle on submit. A
   * ref-shaped callback rather than a duplicate button inside the step: two
   * primary actions on one screen is exactly the confusion the shared footer
   * band exists to prevent.
   */
  submitRef?: { current: null | (() => void) };
  onValidityChange?: (valid: boolean) => void;
  /**
   * WS8 / E179 — bound the body's height so the step is ONE PAGE.
   *
   * Measured before the change: 1010px in join mode and 1222px in define mode
   * against a 900px viewport, with the Continue button off-screen in both. A
   * provider filled the form and could not see the way forward — the "leaks
   * down the bottom" report. The wizard passes this; the standalone /company
   * page doesn't, because there the page IS the content and scrolling is fine.
   */
  bounded?: boolean;
  /**
   * WS-4 — the résumé's current or most-recent employer, offered as a starting
   * point for the search box.
   *
   * A SUGGESTION, never an application. For an independent consultant it is
   * usually their own entity and exactly right; for a W-2 employee it is the
   * company that pays them, which is emphatically not the Panameer billing
   * entity a work order is written against. So it seeds the query — the
   * provider still has to pick or define — and nothing is created until they
   * pass the step.
   */
  suggestedName?: string | null;
}) {
  const [mode, setMode] = useState<"join" | "define">("join");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // join
  const [q, setQ] = useState(suggestedName ?? "");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [picked, setPicked] = useState<CompanyHit | null>(null);

  // define
  const [name, setName] = useState("");
  const [taxType, setTaxType] = useState<TaxTypeValue | "">("");
  const [website, setWebsite] = useState("");
  /*
    ── ⚠⚠ THE CONTRACTING SET (`P1-J1.1-E273` + `E280`, Scott 2026-08-30) ──────

    *"we need to capture the EIN for the company when created"* and *"we NEED the
    corp address here… this will be part of the contracting requirements."*

    `ein` writes to `Company.tin`, WHICH ALREADY EXISTED — nullable and never
    captured. No schema change for it; this is a form catching up with a column.

    `regAddress` is the REGISTERED address and is stored as a `Site` + `Address`
    on the existing backbone (P-Account → Company → Site → Address → Person).
    ⚠ THAT CHOICE IS EXPLAINED IN `lib/company.ts`, and it needed NO schema
    change at all — not even a `db:push`.

    ⚠⚠ REGISTERED ADDRESS ≠ DELIVER-TO. The requester wizard's Work Location is a
    separate value on `RequesterProfile.work_site_id` and stays that way. Scott's
    spec calls that one *"the deliver-to for the engagement"*, and the ERP model
    carries a deliver-to PER TRANSACTION — merging them would make it impossible
    to have work delivered anywhere but head office.

    ── ⚠ ONE COUNTRY QUESTION, NOT TWO — A REPORTED PRESENTATION CHANGE ────────

    `E260a` shipped jurisdiction as its own `<select>`: required, defaulting to
    the United States. An address block also asks for a country, so keeping both
    would have put TWO country selects on one short form and allowed a company
    whose jurisdiction says United States and whose registered address says
    Canada — a contradiction the form itself invites.

    ⚠ SO THERE IS NOW ONE COUNTRY FIELD, inside the address block, and
    `Company.country` is derived from it. ⚠ `E260a`'s CONTRACT IS UNCHANGED:
    still required, still defaults to the United States, still a full country
    name from `COUNTRIES`. Only where it is drawn moved. REPORTED, because Scott
    ruled on that field directly.
  */
  const [ein, setEin] = useState("");
  /*
    ── ⚠ US ZIP, CHECKED ON BLUR (`P1-J1.4-E299`) ─────────────────────────────
    The same rule the server enforces, shown where it can still be fixed cheaply.
    ⚠ US ONLY — see the route's note. Other countries keep the length cap and no
    format, because `K1A 0B1` and `SW1A 1AA` are correct postcodes.
    ⚠ THE BLUR FLAG EXISTS SO THE MESSAGE DOES NOT SCOLD SOMEBODY MID-TYPE — the
    same contract `PhoneField` uses (`E203`): mask/allow on change, judge on blur.
  */
  const [zipTouched, setZipTouched] = useState(false);
  const [einTouched, setEinTouched] = useState(false);

  /*
    ── ENTITY VALIDATION (`P1-J1.1-E282`) ─────────────────────────────────────

    SCOTT: *"Every state has a Secretary of State website. They list their
    corporations under a corporate search."* — and *"let's present it and use
    it"*, which is present and use, NOT lock.

    ⚠⚠ `Continue` IS NEVER DISABLED BY ANY OF THIS (decision 5). Nothing below
    touches `valid`.
  */
  const [stateOfFiling, setStateOfFiling] = useState("");
  const [checking, setChecking] = useState(false);
  const [lookup, setLookup] = useState<ValidationResult | null>(null);
  /**
   * ⚠ WHICH FIELDS CAME FROM THE REGISTER, so each can carry a visible marker
   * UNTIL THE USER EDITS IT. Cleared per-field on edit rather than wholesale —
   * correcting the city should not un-mark the postcode.
   */
  const [fromRegister, setFromRegister] = useState<Set<string>>(new Set());
  const unmark = (k: string) =>
    setFromRegister((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  const [regAddress, setRegAddress] = useState<LocationValue>({
    country: COUNTRIES[0],
  });
  const [companyTos, setCompanyTos] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  /*
    ⚠ THE LOOKUP IS A READ AND IT WRITES NOTHING. `/api/company/validate` never
    persists; `defineCompany()` stays the only writer, which is what lets a user
    correct a bad match before anything is saved.
  */
  const runLookup = async () => {
    setChecking(true);
    setLookup(null);
    try {
      const r = await fetch("/api/company/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: q.trim(), stateOfFiling }),
      });
      const data = (await r.json()) as ValidationResult;
      setLookup(data);
      /* ⚠ EXACTLY ONE MATCH AUTO-FILLS. With several, the user picks — filling
         from the first would be choosing an entity on their behalf. */
      if (data.ok && data.status !== "not_found" && data.matches.length === 1) {
        applyMatch(data.matches[0]);
      }
    } catch {
      setLookup({
        ok: false,
        reason: "error",
        message: "We couldn't reach the register just now. Nothing has been checked.",
      });
    } finally {
      setChecking(false);
    }
  };

  /**
   * ⚠ PRE-FILL, NOT LOCK. Every field stays editable and marked until edited.
   * ⚠ AND IT NEVER TOUCHES THE EIN — a state register does not publish one, and
   * Texas's taxpayer number is a different identifier (see `lib/company-validation.ts`).
   */
  const applyMatch = (m: NonNullable<Extract<ValidationResult, { ok: true }>["matches"]>[number]) => {
    const marks = new Set<string>();
    setName(m.legalName.value);
    setQ(m.legalName.value);
    marks.add("name");
    setRegAddress((a) => {
      const next = { ...a };
      if (m.addressLine1) { next.line1 = m.addressLine1.value; marks.add("line1"); }
      if (m.city) { next.city = m.city.value; marks.add("city"); }
      if (m.stateCode) { next.state = m.stateCode.value; marks.add("state"); }
      if (m.postalCode) { next.postalCode = m.postalCode.value; marks.add("postalCode"); }
      return next;
    });
    setFromRegister(marks);
  };


  /** What the signup email suggests the company might be (E167 nudge). */
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // both
  const [attestation, setAttestation] = useState(false);

  /*
    THE DOMAIN NUDGE (E167 enhancement).

    Someone whose work email is @straterp.com almost certainly works at
    StratERP, so the search starts with that word rather than an empty box.

    IT IS A SUGGESTION AND NOTHING MORE. It pre-fills a text field; it does not
    select a company, does not grant a membership, and does not influence
    approval — auto-approval stays keyed to the company's OWN recorded
    email_domain, decided server-side. A pre-filled search box that quietly
    conferred access would be the same hole this whole model closed.
  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/company/suggest");
      if (!r.ok || cancelled) return;
      const body = (await r.json()) as { suggestion?: string | null };
      if (!body.suggestion || cancelled) return;
      setSuggestion(body.suggestion);
      // Only ever fills an untouched box.
      setQ((cur) => (cur ? cur : body.suggestion!));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (mode !== "join" || q.trim().length < 2) {
        setHits([]);
        return;
      }
      const r = await fetch(`/api/company?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) setHits((await r.json()).companies ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, mode]);

  /*
    ⚠⚠ THE SAME FUNCTION THE SERVER RUNS (`P1-J1.4-E299`). Empty is allowed;
    wrong is not.

    ⚠ SUPERSEDED, quoted: this was a re-typed `/^\d{5}(-\d{4})?$/` plus
    `regAddress.country !== "United States"`, described in its own comment as
    *"Mirrors the server's superRefine exactly"* — a comment asserting two copies
    agree is the tell that there are two copies. Now there is one, in
    `lib/field-formats.ts`, and "mirrors" is a fact rather than a hope.
    ⚠ THE EXACT STRING COMPARE WENT WITH IT: `"USA"` used to skip the check.
  */
  const zipOk = usZip(regAddress.postalCode, regAddress.country).ok;

  /*
    ⚠ EIN, SAME RULE AS THE SERVER'S OBJECT-LEVEL REFINE, INCLUDING HOW COUNTRY
    RESOLVES — jurisdiction first, then the registered address. Optional: blank
    is valid and never blocks Continue.
  */
  const einCountry = regAddress.country ?? null;
  const einOk = einFormat(ein, einCountry).ok;

  const valid =
    mode === "join"
      ? !!picked && attestation
      : name.trim().length > 1 &&
        !!taxType &&
        /*
          ⚠ COUNTRY IS THE REQUIRED PART OF THE ADDRESS, and the street/city are
          not — deliberately, and it is what makes `E273`/`E280`/`E274` consistent
          with each other. `E274` makes the whole COMPANY optional at onboarding
          ("we still probably want to make the company optional at this point"),
          and `E280`'s full contracting set is required BEFORE HIRE, not before
          Continue — see the note on `requesterGaps` in `lib/requester-onboarding.ts`.
          Gating Continue on a full registered address here would re-impose at
          step 1 the requirement Scott just deferred to the work order.
          ⚠ COUNTRY ITSELF STAYS REQUIRED because `E260a` said so, and it is
          defaulted, so nobody is blocked by doing nothing.
        */
        !!regAddress.country &&
        /* `E299` — a malformed US ZIP or EIN blocks Continue; an ABSENT one does
           not (`E274` allows a part-answered company). ⚠ THE EIN IS NEVER
           REQUIRED — `einOk` is true for blank. */
        zipOk &&
        einOk &&
        attestation &&
        companyTos;

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        mode === "join" ? "/api/company/join" : "/api/company/define",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "join"
              ? { companyId: picked!.id, attestation }
              : {
                  name: name.trim(),
                  taxType,
                  /* `E280` — jurisdiction IS the registered address's country. */
                  country: regAddress.country || null,
                  ein: ein.trim() || null,
                  /* `E282` — US only; null everywhere else. */
                  stateOfFiling: stateOfFiling || null,
                  registeredAddress: regAddress,
                  website: website.trim() || null,
                  logoUrl,
                  attestation,
                  companyTos,
                }
          ),
        }
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that.");
        return;
      }
      onDone(body as CompanyOutcome);
    } finally {
      setBusy(false);
    }
  };

  /*
    Publish `submit` to the parent AFTER render, not during it. Assigning a ref
    in the render body is "Cannot update ref during render" — and the closure
    changes with every keystroke, so it genuinely needs re-publishing each
    render rather than once on mount.
  */
  useEffect(() => {
    if (submitRef) submitRef.current = submit;
  });

  return (
    <div className={bounded ? "space-y-3" : "space-y-4"}>
      {error && <Notice>{error}</Notice>}

      {/*
        WS8 / E180 — a SEGMENTED CONTROL, not two large cards.

        The cards were the tallest thing on the step and they asked a question
        the provider can answer in a word. This is the same choice in one row,
        which is most of what buys the page back its footer.
      */}
      <div className="inline-flex rounded-full border border-line p-1 text-[14px] font-semibold">
        {(
          [
            ["join", "Find my company"],
            ["define", "Add my company"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={
              "rounded-full px-4 py-1.5 transition-colors " +
              (mode === m
                ? "bg-magenta text-white"
                : "text-ink-2 hover:text-ink")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={
          bounded
            ? "max-h-[31vh] space-y-3 overflow-y-auto overscroll-contain pr-1"
            : "space-y-4"
        }
      >
      {mode === "join" ? (
        <>
          <Field
            label="Company Name *"
            hint={
              suggestion
                ? `Suggested from your work email. Change it if that's not where you work.`
                : undefined
            }
          >
            <TextInput
              value={q}
              onChange={(e) => {
                /* ⚠ EDITING CLEARS THE MARKER — the value is the user's now. */
                unmark("name");
                setQ(e.target.value);
                setPicked(null);
              }}
              placeholder="Start typing…"
              autoComplete="organization"
            />
          </Field>

          {hits.length > 0 && (
            <div className="space-y-2">
              {hits.map((c) => (
                <OptionCard
                  key={c.id}
                  selected={picked?.id === c.id}
                  onClick={() => {
                    setPicked(c);
                    setQ(c.name);
                  }}
                  title={c.name}
                  description={
                    `${c.members} ${c.members === 1 ? "member" : "members"}` +
                    (c.domain ? ` · ${c.domain}` : "")
                  }
                />
              ))}
            </div>
          )}

          {q.trim().length >= 2 && hits.length === 0 && (
            /*
              E167 — this was one grey sentence with a link in it, and the walk
              read it as a dead end: search returns nothing, Next stays disabled,
              no way forward. It is now a card that says WHY there is no match
              (only companies somebody has already added are listed) and carries
              the way out as a button.
            */
            <div className="rounded-brand border-[1.5px] border-dashed border-line p-5">
              <p className="text-[15.5px] font-bold">
                No company here matches &ldquo;{q.trim()}&rdquo;.
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">
                Only companies someone has already added to Panameer show up in
                this list — yours may simply be the first.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("define");
                  setName(q.trim());
                }}
                className="mt-4 rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Add &ldquo;{q.trim()}&rdquo; as my company
              </button>
            </div>
          )}

          {picked && (
            /*
              WS8 / E180 — "You work here? Attach." The step should feel
              behind-the-scenes: recognise the company, say what happens next in
              one line, and get out of the way. Verification is deferred to the
              pay gate — nobody self-associates to a company that will pay them,
              so the pre-payout fraud risk is low and the friction here is real.
            */
            <Notice tone="info">
              <b>You work at {picked.name}?</b>{" "}
              {picked.domain ? (
                <>
                  If your work email is <b>@{picked.domain}</b>{" "}
                  we&apos;ll attach you straight away — otherwise their admin
                  approves it.
                </>
              ) : (
                <>We&apos;ll ask their admin to approve it.</>
              )}
            </Notice>
          )}
        </>
      ) : (
        <>
          <Field label="Legal Company Name *" hint="The name on your tax filing.">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Manufacturing LLC"
              autoComplete="organization"
            />
          </Field>

          <Field
            label="Business Type *"
            hint="This sets which tax details we ask for later, and nothing else changes."
          >
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as TaxTypeValue)}
              className={SELECT}
            >
              <option value="">Choose a business type…</option>
              {TAX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                  {t.hint ? ` — ${t.hint}` : ""}
                </option>
              ))}
            </select>
          </Field>

          {/*
            ⚠ SCOTT NAMED THIS FIELD "EIN" (`E273`) and the label uses his word.
            It writes to `Company.tin`, which is the generic tax-registration id
            (EIN · VAT/company number · SSN/ITIN) — the column is deliberately
            broader than the US-specific label, and the hint says so rather than
            promising a US-only form.
            ⚠ NOT REQUIRED HERE — see the `valid` note above and `E274`.
          */}
          {/*
            ── ⚠⚠ STATE OF FILING + THE LOOKUP (`P1-J1.1-E282`) ────────────────

            SCOTT: *"The user gives the company name and the state of filing.
            Panameer does the rest."*

            ⚠ US ONLY (decision 5), so the whole block is conditional on the
            registered address's country — which is also the jurisdiction
            (`E260`/`E280`).
            ⚠⚠ AND NOTHING HERE CAN BLOCK `Continue`. `valid` is untouched by
            this feature: a failed lookup, an unsupported state and a company
            that is not on the register all leave the form exactly as the user
            left it.
            ⚠ EVERY US STATE IS OFFERED, INCLUDING THE ONES WE CANNOT CHECK.
            Hiding Delaware would leave somebody wondering why their state is
            missing; telling them we cannot check it yet is information.
          */}
          {/*
            ⚠ THE MARKER, NOT A LOCK. Scott: *"let's present it and use it"* —
            so the value is filled in, attributed, and fully editable; the chip
            disappears the moment the user changes the field.
          */}
          {fromRegister.has("name") && (
            <p className="-mt-2 text-[12.5px] text-ink-2">
              ✓ Legal name from the state register — edit it if it&rsquo;s wrong.
            </p>
          )}

          {isUnitedStates(regAddress.country) && (
            <div className="rounded-brand border border-line p-4">
              <Field
                label="State of filing"
                hint="Where the company is registered. We'll look it up on that state's corporate register."
              >
                <select
                  value={stateOfFiling}
                  onChange={(e) => {
                    setStateOfFiling(e.target.value);
                    setLookup(null);
                  }}
                  className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px]"
                >
                  <option value="">Choose a state…</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                      {SUPPORTED_STATES.includes(st) ? "" : " — can't check yet"}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                type="button"
                onClick={() => void runLookup()}
                disabled={checking || !stateOfFiling || q.trim().length < 2}
                className="mt-3 rounded-full border-[1.5px] border-magenta px-5 py-2 text-[14px] font-bold text-magenta transition-colors hover:bg-magenta hover:text-white disabled:opacity-40"
              >
                {checking ? "Checking the register…" : "Look up this company"}
              </button>

              {/* ── THE RESULT. ⚠ NEVER CLAIMS MORE THAN THE REGISTER RETURNED. */}
              {lookup && !lookup.ok && (
                <p className="mt-3 rounded-[10px] border border-line bg-bg-soft px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  {lookup.message}
                </p>
              )}
              {lookup?.ok && lookup.status === "not_found" && (
                <p className="mt-3 rounded-[10px] border border-line bg-bg-soft px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
                  No company starting with that name on the {lookup.registerName}.
                  Check the spelling, or carry on — we haven&rsquo;t changed anything.
                </p>
              )}
              {lookup?.ok && lookup.matches.length > 1 && (
                <div className="mt-3">
                  <p className="text-[13.5px] font-semibold">
                    {lookup.totalMatches} entities start with that name. Which one?
                  </p>
                  <ul className="mt-2 grid gap-1.5">
                    {lookup.matches.map((m) => (
                      <li key={m.entityNumber?.value ?? m.legalName.value}>
                        <button
                          type="button"
                          onClick={() => applyMatch(m)}
                          className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-left text-[13.5px] transition-colors hover:border-magenta"
                        >
                          <b>{m.legalName.value}</b>
                          <span className="text-ink-2">
                            {m.entityType ? ` · ${m.entityType.value}` : ""}
                            {m.city ? ` · ${m.city.value}` : ""}
                            {m.status ? ` · ${m.status.value}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lookup?.ok && lookup.matches.length === 1 && (
                <div className="mt-3 rounded-[10px] border border-line bg-bg-soft px-3 py-2.5 text-[13.5px] leading-relaxed">
                  {/*
                    ⚠⚠ THE CLAIM MATCHES WHAT WAS ACTUALLY READ. New York's
                    register publishes NO status column, so for New York this says
                    "listed on" and never "in good standing" — `publishesStatus`
                    is what carries that, and it comes from the adapter.
                  */}
                  <p>
                    <b>
                      {lookup.status === "not_in_good_standing"
                        ? "Found, but not marked in good standing"
                        : "Found on the register"}
                    </b>{" "}
                    — {lookup.matches[0].legalName.value}
                    {lookup.matches[0].entityNumber
                      ? `, entity #${lookup.matches[0].entityNumber.value}`
                      : ""}
                    .
                  </p>
                  <p className="mt-1 text-ink-2">
                    {lookup.publishesStatus && lookup.matches[0].status
                      ? `The register records its status as “${lookup.matches[0].status.value}”.`
                      : "This register doesn't publish a status, so we haven't checked good standing."}
                  </p>
                  <p className="mt-1 text-ink-2">
                    We&rsquo;ve filled in what it holds. Everything stays editable —
                    change anything that looks wrong.
                  </p>
                  <a
                    href={lookup.matches[0].legalName.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block font-semibold text-magenta hover:underline"
                  >
                    {lookup.registerName} ↗
                  </a>
                </div>
              )}
            </div>
          )}

          <Field
            label="EIN"
            hint="Your federal tax id. Outside the US, the equivalent company or VAT registration number."
          >
            <TextInput
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              onBlur={() => setEinTouched(true)}
              placeholder="12-3456789"
              autoComplete="off"
            />
            {/*
              ⚠ ON BLUR, WHICH IS WHAT SCOTT ASKED FOR: *"i added an alpha and
              tabbed out… didn't get an error."* Not while typing — flagging
              `12-345` mid-entry would call every EIN wrong for the first eight
              keystrokes.
              ⚠ THE MESSAGE IS THE SHARED CONSTANT, so this cannot drift from the
              route's refusal.
            */}
            {einTouched && !einOk && (
              <p className="mt-1 text-[13px] text-red-700">{EIN_MESSAGE}</p>
            )}
          </Field>

          {/*
            ⚠⚠ THE REGISTERED ADDRESS (`E280`) — the entity you contract WITH,
            not where work is delivered. See the block at the top of this file.
            ⚠ `LocationFields` IS REUSED, NOT RE-TYPED: it is the one component
            that already knows a region is a "State" in the US and a "Province"
            in Canada, and it is what the requester wizard's Work Location uses.
            Two address forms in one product is the drift it exists to prevent.
          */}
          <div>
            <p className="mb-2 text-[14px] font-bold text-ink">
              Registered Address
            </p>
            <div className="space-y-3">
              <div onBlur={() => setZipTouched(true)}>
                <LocationFields
                  value={regAddress}
                  onChange={(patch) => {
                    /* ⚠ ONLY THE EDITED KEYS LOSE THEIR MARKER — correcting the
                       city must not un-attribute the postcode. */
                    for (const k of Object.keys(patch)) unmark(k);
                    setRegAddress((a) => ({ ...a, ...patch }));
                  }}
                  withStreet
                  countryHint="Where the company is registered — its jurisdiction."
                />
              </div>
              {/*
                ⚠ THE MESSAGE LIVES HERE, NOT INSIDE `LocationFields` (`E299`).
                That component is SHARED with the requester wizard's Work
                Location, and this brief says not to touch the requester wizard.
                A blur listener on the wrapper gets the same behaviour without
                changing a component two journeys render.
              */}
              {/* ⚠ `E282` — same marker rule for the address the lookup filled. */}
              {["line1", "city", "state", "postalCode"].some((k) => fromRegister.has(k)) && (
                <p className="mt-1 text-[12.5px] text-ink-2">
                  ✓ Address from the state register — edit anything that looks wrong.
                </p>
              )}
              {/* ⚠ THE CONSTANT, NOT THE SENTENCE (`E299`). The literal that was
                  here was the second copy of the server's message. */}
              {zipTouched && !zipOk && (
                <p className="mt-1 text-[13px] text-red-700">{US_ZIP_MESSAGE}</p>
              )}
            </div>
          </div>

          <Field label="Website">
            <TextInput
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              autoComplete="url"
            />
          </Field>

          {/*
            COMPANY LOGO (E168). Optional, and it uploads immediately so the
            person sees what they picked before committing — the same pattern as
            the profile photo. Storing it under the person's folder until the
            company exists is what lets it be uploaded BEFORE define.
          */}
          <div>
            <span className="mb-1 block text-[14px] font-bold text-ink">
              Company Logo
            </span>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line bg-bg-soft">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[11px] font-semibold text-ink-2">Logo</span>
                )}
              </span>
              <span>
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => logoInput.current?.click()}
                  className="rounded-full border-[1.5px] border-line px-5 py-2 text-[14px] font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
                >
                  {logoBusy ? "Uploading…" : logoUrl ? "Change logo" : "Upload a logo"}
                </button>
                <span className="ml-3 text-[13px] text-ink-2">
                  Optional — PNG, JPG or WebP.
                </span>
              </span>
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setLogoBusy(true);
                setError(null);
                try {
                  const fd = new FormData();
                  fd.append("file", f);
                  const r = await fetch("/api/company/logo", { method: "POST", body: fd });
                  const b = await r.json().catch(() => ({}));
                  if (!r.ok) {
                    setError(b.error ?? "Could not upload that image.");
                    return;
                  }
                  setLogoUrl(b.logoUrl);
                } finally {
                  setLogoBusy(false);
                  if (logoInput.current) logoInput.current.value = "";
                }
              }}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-line p-3">
            <input
              type="checkbox"
              checked={companyTos}
              onChange={(e) => setCompanyTos(e.target.checked)}
              className="mt-1 h-4 w-4 accent-magenta"
            />
            <span className="text-[14px] text-ink-2">
              On behalf of this company, I accept the Panameer{" "}
              <LegalLink href="/company-terms">
                Company Terms of Service
              </LegalLink>
              . We&apos;ll record who accepted it and when.
            </span>
          </label>
        </>
      )}

      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-line p-3">
        <input
          type="checkbox"
          checked={attestation}
          onChange={(e) => setAttestation(e.target.checked)}
          className="mt-1 h-4 w-4 accent-magenta"
        />
        <span className="text-[14px] text-ink-2">
          I&apos;m authorized to represent this company on Panameer.
        </span>
      </label>
    </div>
  );
}
