"use client";

import { useEffect, useRef, useState } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import { Field, TextInput, Notice, OptionCard } from "@/components/onboarding/controls";
/* THE ONE CANONICAL LIST (`E729` WS-C). */
import { ALL_COUNTRIES } from "@/lib/country";
import { CompanyLogoTile } from "@/components/company/CompanyLogoTile";
/* IMPORTS KEPT FOR THE COMMENTED FIELD BLOCKS BELOW (`E408` / `E164`). */
// } from "@/components/onboarding/LocationFields"

/** DEFINE OR JOIN — the company building block, shared by BOTH onboarding tracks */

export type TaxTypeValue =
  | "C_CORP"
  | "S_CORP"
  | "LLC"
  | "PARTNERSHIP"
  | "SOLE_PROP_INDIVIDUAL"
  | "NONPROFIT";

// UNREAD SINCE stripped Business Type from the form. Kept per —
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // not completed the company form. The name IS STORED (the signup placeholder is
  status: "APPROVED" | "PENDING" | "REJECTED" | "NAME_ONLY";
  autoApproved?: boolean;
};

const SELECT =
  "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

export function CompanyStep({
  onDone,
  onBusyChange,
  submitRef,
  onValidityChange,
  onHasNameChange,
  bounded = false,
  suggestedName = null,
  startDefine = false,
  defineName = null,
  defineWebsite = null,
  nameLabel = "Company Name *",
}: {
  onDone: (outcome: CompanyOutcome) => void;
  onBusyChange?: (busy: boolean) => void;
  /** The wizard owns the Continue button, so it needs a handle on submit. A */
  submitRef?: { current: null | (() => void) };
  onValidityChange?: (valid: boolean) => void;
  /** SEPARATE FROM `onValidityChange`, AND THAT SEPARATION IS THE FIX */
  onHasNameChange?: (hasName: boolean) => void;
  /** WS8 / E179 — bound the body's height so the step is ONE PAGE. */
  bounded?: boolean;
  /** WS-4 — the résumé's current or most-recent employer, offered as a starting */
  suggestedName?: string | null;
  /** Website-first join hands off here: open the define form with the name and website filled in. */
  startDefine?: boolean;
  defineName?: string | null;
  defineWebsite?: string | null;
  /** THE ENTITY WORD, BECAUSE THIS STEP RENDERS ON THREE SURFACES AND THEY */
  nameLabel?: string;
}) {
  const [mode, setMode] = useState<"join" | "define">(startDefine ? "define" : "join");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // join
  const [q, setQ] = useState(suggestedName ?? "");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [picked, setPicked] = useState<CompanyHit | null>(null);

  // define
  const [name, setName] = useState(defineName ?? "");
  // UNUSED SINCE STRIPPED THE FORM — COMMENTED, NOT DELETED
  // const [taxType, setTaxType] = useState<TaxTypeValue | "">("");
  const [website, setWebsite] = useState(defineWebsite ?? "");
  // THE COMPANY'S COUNTRY, STANDALONE ( WS-1). It used to live inside
  const [country, setCountry] = useState<string>("");
  // THE CONTRACTING SET + , Scott 2026-08-30)

  // SCOTT: *"Every state has a Secretary of State website. They list their
  /** WHICH FIELDS CAME FROM THE REGISTER, so each can carry a visible marker */
  const [fromRegister, setFromRegister] = useState<Set<string>>(new Set());
  const unmark = (k: string) =>
    setFromRegister((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  // — the registered address left the form; kept per .
  const [companyTos, setCompanyTos] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  // THE LOOKUP IS A READ AND IT WRITES NOTHING. `/api/company/validate` never
  // UNREAD SINCE STRIPPED THE FORM — COMMENTED, NOT DELETED
  // const runLookup = async () => {

  /** PRE-FILL, NOT LOCK. Every field stays editable and marked until edited. */
  // UNREAD SINCE — its only caller was the register-lookup UI
  // const applyMatch = (m: NonNullable<Extract<ValidationResult, { ok: true }>["matches"]>[number]) => {


  /** What the signup email suggests the company might be (E167 nudge). */
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // both
  const [attestation, setAttestation] = useState(false);

  // THE DOMAIN NUDGE (E167 enhancement).
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

  // THE SAME FUNCTION THE SERVER RUNS . Empty is allowed
  // — the US ZIP no longer gates Continue; the address is gone.

  // EIN, SAME RULE AS THE SERVER'S OBJECT-LEVEL REFINE, INCLUDING HOW COUNTRY
  // — the EIN moved to the payment gate (`api/settings/tax`).

  const valid =
    mode === "join"
      ? !!picked && attestation
      : name.trim().length > 1 &&
        // WHAT CONTINUE NOW REQUIRES ( WS-1)
        // COUNTRY IS THE REQUIRED PART OF THE ADDRESS, and the street/city are
        !!country &&
        attestation &&
        companyTos;

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  // the button cannot offer a save the lib will refuse.
  const hasName = mode === "define" && name.trim().length > 1;
  useEffect(() => {
    onHasNameChange?.(hasName);
  }, [hasName, onHasNameChange]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const submit = async () => {
    // PART-ANSWERED IS ITS OWN OUTCOME NOW / )
    if (!valid) {
      if (!hasName) return;
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/company/define", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameOnly: true, name: name.trim() }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(body.error ?? "Could not save that name.");
          return;
        }
        onDone(body as CompanyOutcome);
      } finally {
        setBusy(false);
      }
      return;
    }
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
                  taxType: undefined,
                  // — jurisdiction IS the registered address's country.
                  // FROM THE STANDALONE SELECT NOW ( WS-1), not from the
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

  // Publish `submit` to the parent AFTER render, not during it. Assigning a ref
  useEffect(() => {
    if (submitRef) submitRef.current = submit;
  });

  return (
    <div className={bounded ? "space-y-3" : "space-y-4"}>
      {error && <Notice>{error}</Notice>}

      {/* WS8 / E180 — a SEGMENTED CONTROL, not two large cards. */}
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
              "px-4 py-1.5 transition-colors " +
              (mode === m
                ? "bg-ink text-surface"
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
            label={nameLabel}
            hint={
              suggestion
                ? `Suggested from your work email. Change it if that's not where you work.`
                : undefined
            }
          >
            <TextInput
              value={q}
              onChange={(e) => {
                /* EDITING CLEARS THE MARKER — the value is the user's now. */
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
            // E167 — this was one grey sentence with a link in it, and the walk
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
                className="mt-4 bg-ink px-6 py-2.5 text-[14.5px] font-semibold text-surface transition-colors hover:bg-ink-hover"
              >
                Add &ldquo;{q.trim()}&rdquo; as My Company
              </button>
            </div>
          )}

          {picked && (
            // WS8 / E180 — "You work here? Attach." The step should feel
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

          {/* STRIPPED BY . COMMENTED, NOT DELETED */}

          {/* SCOTT NAMED THIS FIELD "EIN" and the label uses his word. */}
          {/* STATE OF FILING + THE LOOKUP */}
          {/* THE MARKER, NOT A LOCK. Scott: *"let's present it and use it"* — */}
          {fromRegister.has("name") && (
            <p className="-mt-2 text-[12.5px] text-ink-2">
              ✓ Legal name from the state register — edit it if it&rsquo;s wrong.
            </p>
          )}

          {/* STRIPPED BY . COMMENTED, NOT DELETED */}


          {/* STRIPPED BY . COMMENTED, NOT DELETED */}


          {/* THE REGISTERED ADDRESS — the entity you contract WITH */}
          {/* STRIPPED BY . COMMENTED, NOT DELETED */}


          {/* STRIPPED BY . COMMENTED, NOT DELETED */}


          {/* ONE COUNTRY SELECT — NOT AN ADDRESS BLOCK ( WS-1) */}
          <Field
            label="Country *"
            hint="Where the company is based. It decides how you'd be paid, and buyers filter by it."
          >
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={SELECT}
            >
              {/* ALL 245, BY CODE, SHOWING THE NAME ( WS-C). `check:company-step` */}
              <option value="">Choose a country…</option>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* OPTIONAL, AND THE HINT SAYS SO IN WORDS. Scott: *"most small */}
          <Field label="Website" hint="Optional — leave it blank if you don't have one.">
            <TextInput
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              autoComplete="url"
            />
          </Field>

          {/* COMPANY LOGO (E168). Optional, and it uploads immediately so the */}
          <div>
            <span className="mb-1 block text-[14px] font-bold text-ink">
              Company Logo
            </span>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden border border-line bg-bg-soft">
                {logoUrl ? (
                  <CompanyLogoTile src={logoUrl} alt="" className="h-full w-full" pad="3px" />
                ) : (
                  <span className="text-[11px] font-semibold text-ink-2">Logo</span>
                )}
              </span>
              <span>
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => logoInput.current?.click()}
                  className="border border-ink bg-surface px-5 py-2 text-[14px] font-semibold transition-colors hover:bg-surface-hover disabled:opacity-50 text-ink"
                >
                  {logoBusy ? "Uploading…" : logoUrl ? "Change Logo" : "Upload a Logo"}
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
