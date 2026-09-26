"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAX_LABELS } from "@/lib/tax-types";

/**
 * ── ⚠⚠⚠ EDIT MY COMPANY (brief 10 — `P2-A2-E661`) ────────────────────────
 *
 * ⚠ **SCOTT, walking `/company`: *"I cannot edit any of the data."*** The page
 * rendered `name`, the business type and the email domain as plain text and
 * offered **no control at all**. ⚠⚠ `/company/settings` looked like the natural
 * home and is **a placeholder** — its own docblock says *"The route, its title
 * and its gate are real; only the content is pending."* ⚠⚠⚠ **SO THE EDITING
 * DID NOT EXIST ANYWHERE** (`69a`, checked before building: nothing was already
 * doing this better).
 *
 * ⚠ **IT IS MOUNTED WHERE THE DATA IS READ**, not one page away. A member who
 * is looking at a field is the member who wants to change it, and a separate
 * settings page is how *"I couldn't, so it kept me from doing anything"*
 * happened on this very route before (`P1-J1.2-E004`).
 *
 * ── ⚠⚠ WHAT IS DELIBERATELY ABSENT FROM THIS FORM ───────────────────────
 *
 * ⚠⚠⚠ **`email_domain` IS NOT EDITABLE, AND IT IS AN ACCESS-CONTROL FIELD
 * WEARING THE COSTUME OF A CONTACT DETAIL.** `joinCompany` auto-approves a
 * joiner whose work email matches it, and `defineCompany`'s own comment already
 * says why: *"Recording gmail.com here would auto-approve every Gmail user in
 * the world into this company."* ⚠ An edit box here is a self-serve way to
 * widen who gets into the company. **Reported, not built.**
 * ⚠ **THE LOGO IS ABSENT TOO** — it has its own upload route
 * (`/api/company/logo`), and a second writer would be `E585`.
 *
 * ── ⚠ THE SHAPE OF THE SAVE ─────────────────────────────────────────────
 *
 * ⚠⚠ **EVERY FIELD IS SENT ON EVERY SAVE**, so clearing a box clears the
 * column. The server keeps *"not submitted"* and *"cleared"* apart; this form
 * simply always submits, which is the shape that makes a clear possible at all.
 * ⚠ **THE ERROR IS THE SERVER'S OWN MESSAGE**, not a generic one — the admin
 * refusal (403) reads *"Only a company admin can change these"*, which tells
 * the member the actual reason rather than making them guess.
 * ⚠⚠ `router.refresh()` RATHER THAN LOCAL STATE: the header above renders the
 * company name from the server, so a local-only update would leave the page
 * showing two different names at once.
 */
export function CompanyDetailsForm({
  initial,
}: {
  initial: {
    name: string;
    legalName: string | null;
    taxType: string | null;
    country: string | null;
    stateOfFiling: string | null;
    ein: string | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name ?? "",
    legalName: initial.legalName ?? "",
    taxType: initial.taxType ?? "",
    country: initial.country ?? "",
    stateOfFiling: initial.stateOfFiling ?? "",
    ein: initial.ein ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      /*
        ── ⚠⚠⚠ `""` IS NOT AN ENUM VALUE — SEND `null` (`E661`) ─────────────

        ⚠⚠ **CAUGHT BEFORE SHIPPING, AND IT WOULD HAVE BROKEN THE COMMON CASE.**
        The `<select>`'s "Not set" option carries `value=""`, but `taxType` is
        validated as `z.enum(...).nullable()` — ⚠⚠⚠ **so `""` is neither a
        member of the enum nor `null`, and EVERY save on a company with no
        business type would have returned 400 "Check those details".** That is
        most of them: the company this was first rendered against has
        `tax_type: null`.
        ⚠ The other fields keep `""` deliberately — for them empty means CLEAR,
        and the writer turns it into `null`. Only the enum cannot carry that
        convention, because an empty string is not one of its values.
      */
      const body = { ...form, taxType: form.taxType === "" ? null : form.taxType };
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(result?.error ?? "That didn't save.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      /* ⚠ A THROWN FETCH MUST NOT PRODUCE SILENCE — `E516`'s family: five
         blocks in this codebase had `try`/`finally` with no `catch` and a
         failed request simply did nothing visible. */
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ⚠ `taxType` IS ABSENT FROM THIS LIST ON PURPOSE — it is an ENUM and gets a
     `<select>` below, not a text box. See the block above it. */
  const FIELDS: { key: keyof typeof form; label: string; hint?: string }[] = [
    { key: "name", label: "Company Name" },
    { key: "legalName", label: "Legal Name", hint: "If it differs from the name buyers see." },
    { key: "country", label: "Country" },
    { key: "stateOfFiling", label: "State of Filing" },
    { key: "ein", label: "EIN / Tax Registration" },
  ];

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="block text-[13px] font-semibold text-ink">{f.label}</span>
          {f.hint && (
            <span className="block text-[12.5px] leading-snug text-ink-2">{f.hint}</span>
          )}
          <input
            value={form[f.key]}
            onChange={set(f.key)}
            className="mt-1 min-h-[44px] w-full rounded-[10px] border border-line bg-white px-3 text-[14px] text-ink"
          />
        </label>
      ))}

      {/*
        ── ⚠⚠⚠ AN ENUM GETS A SELECT, NOT A TEXT BOX (`E579`) ───────────────

        ⚠⚠ **THE FIRST VERSION OF THIS FORM SHIPPED `Business Type` AS AN
        `<input>`, AND I CAUGHT IT BY LOOKING AT THE RENDERED PAGE.**
        `Company.tax_type` is a Prisma **enum**, so any other string is rejected
        **at the database** — the member would have typed "Ltd", pressed Save
        and received a **500**. ⚠⚠⚠ *A control whose handler refuses is a door
        onto a wall*, and a free-text box over a closed set is exactly that.
        ⚠ The options come from `TAX_LABELS`, the same map the header above
        renders the current value with, so the two cannot disagree (`E585`).
        ⚠ The empty option is how a member CLEARS it — the column is nullable
        and the writer keeps "cleared" apart from "not submitted".
      */}
      <label className="block">
        <span className="block text-[13px] font-semibold text-ink">Business Type</span>
        <select
          value={form.taxType}
          onChange={set("taxType")}
          className="mt-1 min-h-[44px] w-full rounded-[10px] border border-line bg-white px-3 text-[14px] text-ink"
        >
          <option value="">Not set</option>
          {Object.entries(TAX_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-[13px] font-semibold text-emerald-700">Saved.</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[44px] items-center rounded-full bg-magenta px-5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {/* ⚠ A STATUS SENTENCE INSIDE A BUTTON IS NOT A LABEL AND STAYS A
            SENTENCE (rule 11); the label itself is Title Case. */}
        {busy ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
