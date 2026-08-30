"use client";

import { useEffect, useRef, useState } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import { Field, TextInput, Notice, OptionCard } from "@/components/onboarding/controls";
import { COUNTRIES } from "@/lib/countries";

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
    JURISDICTION (`P1-J1.1-E260`) — Scott, 2026-08-30: *"Jurisdiction is just
    country. do this."*

    ⚠⚠ OPTIONAL ON PURPOSE, AND THAT IS A SCOPE DECISION WORTH READING.
    `CompanyStep` is shared by SIX call sites — the requester wizard, the
    provider wizard, `(app)/company`, `CompanyStepInline` and `NoProfileYet` —
    so a field added here appears in ALL of them, including the provider journey
    this brief did not ask for. Leaving it out of `valid` below means NO existing
    Continue gate anywhere changed, so nothing that used to pass can now block.
    Making it required, or scoping it to the requester with a prop, are both
    one-line changes and both are Scott's call.
  */
  const [country, setCountry] = useState("");
  const [companyTos, setCompanyTos] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

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

  const valid =
    mode === "join"
      ? !!picked && attestation
      : name.trim().length > 1 && !!taxType && attestation && companyTos;

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
                  country: country || null,
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
            ⚠ THE SHARED COUNTRY LIST, NOT A RETYPED ONE (`E260`). `COUNTRIES`
            in `lib/countries.ts` is what every address field on this site
            already uses, and it stores FULL NAMES ("United States"), not ISO
            codes — `Company.country` matches that shape deliberately.
            ⚠ NO `*` IN THE LABEL, because it does not gate Continue. A star on
            a field that lets you past is the kind of small lie that teaches
            people to ignore stars.
          */}
          <Field
            label="Country"
            hint="Where the company is registered — its jurisdiction."
          >
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={SELECT}
            >
              <option value="">Choose a country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

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
