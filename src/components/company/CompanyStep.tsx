"use client";

import { useEffect, useState } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import { Field, TextInput, Notice, OptionCard } from "@/components/onboarding/controls";

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
}) {
  const [mode, setMode] = useState<"join" | "define">("join");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // join
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [picked, setPicked] = useState<CompanyHit | null>(null);

  // define
  const [name, setName] = useState("");
  const [taxType, setTaxType] = useState<TaxTypeValue | "">("");
  const [website, setWebsite] = useState("");
  const [companyTos, setCompanyTos] = useState(false);

  // both
  const [attestation, setAttestation] = useState(false);

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
                  website: website.trim() || null,
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
    <div className="space-y-4">
      {error && <Notice>{error}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2">
        <OptionCard
          selected={mode === "join"}
          onClick={() => setMode("join")}
          title="Join a company already here"
          description="Search for it by name."
        />
        <OptionCard
          selected={mode === "define"}
          onClick={() => setMode("define")}
          title="Add my company"
          description="You'll be its admin. Working for yourself? That's a company of one."
        />
      </div>

      {mode === "join" ? (
        <>
          <Field label="Company Name *">
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
            <p className="text-[14.5px] text-ink-2">
              Nothing matches &ldquo;{q.trim()}&rdquo;.{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("define");
                  setName(q.trim());
                }}
                className="font-bold text-magenta hover:underline"
              >
                Add it instead
              </button>
              .
            </p>
          )}

          {picked && (
            <Notice tone="info">
              {picked.domain ? (
                <>
                  If your work email is <b>@{picked.domain}</b>{" "}
                  you&apos;ll be approved straight away. Otherwise{" "}
                  <b>{picked.name}</b>&apos;s admin gets your request.
                </>
              ) : (
                <>
                  <b>{picked.name}</b>&apos;s admin will be asked to approve you.
                </>
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

          <Field label="Website">
            <TextInput
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              autoComplete="url"
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-line p-4">
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

      <label className="flex cursor-pointer items-start gap-3 rounded-brand border border-line p-4">
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
