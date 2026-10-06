"use client";

import { useEffect, useState } from "react";
import { CompanyStep, type CompanyOutcome } from "@/components/company/CompanyStep";

// Join a company, website first (company v3 E): sign-up company step and "Join yours instead".
type Props = {
  onDone: (outcome: CompanyOutcome) => void;
  onBusyChange?: (busy: boolean) => void;
  submitRef?: { current: null | (() => void) };
  onValidityChange?: (valid: boolean) => void;
  bounded?: boolean;
};
type Found = { domain: string | null; freeMail: boolean; match: { id: string; name: string; logoUrl: string | null } | null };

const nameFromDomain = (d: string) => {
  const label = d.split(".")[0] ?? d;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function CompanyFinder(props: Props) {
  const { onDone, onBusyChange, submitRef, onValidityChange } = props;
  const [who, setWho] = useState<"company" | "employee">("company");
  const [site, setSite] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<null | { define: boolean; name?: string; website?: string }>(null);

  // Look up as they type: x.com, www.x.com or a full URL all reduce to the domain on the server.
  useEffect(() => {
    if (fallback) return;
    const v = site.trim();
    if (!/\.[a-z]{2,}/i.test(v)) return;
    let live = true;
    const t = setTimeout(async () => {
      setLooking(true);
      const r = await fetch(`/api/company/match?site=${encodeURIComponent(v)}`).catch(() => null);
      const b = (await r?.json().catch(() => null)) as Found | null;
      if (live) {
        setFound(b);
        setLooking(false);
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [site, fallback]);

  const request = async () => {
    if (!found?.match) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    const r = await fetch("/api/company/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: found.match.id, attestation: true, matchedOn: `website:${found.domain}` }),
    }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string; companyId?: string; name?: string; status?: CompanyOutcome["status"] };
    setBusy(false);
    onBusyChange?.(false);
    if (!r?.ok) return setError(b.error ?? "That request didn't go through.");
    onDone({ companyId: b.companyId!, name: b.name ?? found.match.name, status: b.status ?? "PENDING" });
  };

  const canRequest = !!found?.match && !busy;
  useEffect(() => {
    if (fallback) return;
    onValidityChange?.(canRequest);
    if (submitRef) submitRef.current = canRequest ? () => void request() : null;
  });

  if (fallback)
    return (
      <div data-finder-fallback>
        <button type="button" onClick={() => setFallback(null)} className="mb-3 text-[13px] font-semibold text-magenta-dark underline">
          ← Back to Website Search
        </button>
        <CompanyStep {...props} startDefine={fallback.define} defineName={fallback.name ?? null} defineWebsite={fallback.website ?? null} />
      </div>
    );

  const RADIO = "flex cursor-pointer gap-3 border-b border-line/60 py-3";
  return (
    <div data-company-finder className="space-y-5">
      <fieldset>
        <legend className="text-[15px] font-bold">Who pays you for this work?</legend>
        <label className={RADIO}>
          <input type="radio" name="who" checked={who === "company"} onChange={() => setWho("company")} className="mt-1 h-4 w-4" data-who="company" />
          <span>
            <b className="block text-[14.5px]">A company or my own business</b>
            <span className="text-[13.5px] text-ink-2">Includes sole proprietors and 1099 contractors.</span>
          </span>
        </label>
        <label className={RADIO}>
          <input type="radio" name="who" checked={who === "employee"} onChange={() => setWho("employee")} className="mt-1 h-4 w-4" data-who="employee" />
          <span>
            <b className="block text-[14.5px]">I&apos;m an employee (W-2 in the US)</b>
            <span className="text-[13.5px] text-ink-2">We&apos;ll connect you to your employer&apos;s company.</span>
          </span>
        </label>
      </fieldset>

      <label className="block">
        <span className="block text-[14px] font-semibold">{who === "employee" ? "Your employer's website" : "Your company's website"}</span>
        <input
          value={site}
          onChange={(e) => {
            setSite(e.target.value);
            if (!/\.[a-z]{2,}/i.test(e.target.value.trim())) setFound(null);
          }}
          placeholder="straterp.com"
          name="website"
          inputMode="url"
          autoComplete="url"
          className="mt-1 min-h-[44px] w-full border border-line bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none"
        />
      </label>

      {looking && <p className="text-[13px] text-ink-3">Looking…</p>}
      {!looking && found?.freeMail && (
        <p role="alert" data-free-mail className="text-[13.5px] font-semibold text-magenta-dark">
          Use your company&apos;s website — {found.domain} is an email provider, not a company.
        </p>
      )}
      {!looking && found?.match && (
        <div data-match-card className="flex flex-wrap items-center gap-4 border border-ink p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center border border-line bg-white">
            {found.match.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={found.match.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <b className="text-[20px]">{found.match.name.trim()[0]?.toUpperCase()}</b>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[15px]">{found.match.name} is already on Panameer</b>
            <span className="text-[13.5px] text-ink-2">Ask to join. An admin there reviews it, and you&apos;ll get a notice when they answer.</span>
          </span>
          <button type="button" data-request-join disabled={busy} onClick={request} className="min-h-[42px] bg-ink px-4 text-[13px] font-bold text-surface disabled:opacity-50">
            {busy ? "Sending…" : "Request to Join"}
          </button>
        </div>
      )}
      {!looking && found && !found.match && !found.freeMail && found.domain && (
        <div data-no-match className="border-l-2 border-ink py-1 pl-3 text-[13.5px]">
          {who === "employee" ? (
            <>No company on Panameer uses {found.domain} yet. Ask your employer&apos;s admin to add it, or check the website.</>
          ) : (
            <>
              No company on Panameer uses {found.domain} yet.{" "}
              <button type="button" data-add-found onClick={() => setFallback({ define: true, name: nameFromDomain(found.domain!), website: found.domain! })} className="font-bold text-magenta-dark underline">
                Add {nameFromDomain(found.domain)} as a New Company
              </button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-[13px] font-semibold text-magenta-dark">{error}</p>}

      <p className="text-[13px] text-ink-2">
        Not a match?{" "}
        {who === "company" && (
          <>
            <button type="button" onClick={() => setFallback({ define: true })} className="font-semibold text-magenta-dark underline">Add a New Company</button>
            {" · "}
          </>
        )}
        <button type="button" data-no-website onClick={() => setFallback({ define: false })} className="font-semibold text-magenta-dark underline">My Company Has No Website</button>
      </p>
    </div>
  );
}
