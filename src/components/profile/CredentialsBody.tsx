"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CLEAN_CHIP } from "@/components/profile/CleanSection";
import { BRAND_GRADIENT } from "@/lib/certificate-links";
import type { CertificationItem } from "@/components/profile/sections";

// Credentials (2026-10-08): grouped headings with chips, like Skills. Verified (Learn) chips are filled ink with ✓.
export const CREDENTIAL_KINDS = [
  { key: "CERTIFICATION", label: "Certifications", one: "Certification" },
  { key: "LICENSE", label: "Licenses", one: "License" },
  { key: "AWARD", label: "Awards", one: "Award" },
  { key: "MEMBERSHIP", label: "Memberships", one: "Membership" },
  { key: "INSURANCE", label: "Insurance & Bonding", one: "Insurance & Bonding" },
] as const;

const VERIFIED_CHIP = "inline-flex items-center gap-1 bg-ink px-3 py-1 text-[12px] font-medium text-surface";
const day = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : null);
const isExpired = (c: CertificationItem) => !!c.expiresOn && c.expiresOn.slice(0, 10) < new Date().toISOString().slice(0, 10);

export function CredentialsBody({ credentials, empty, emptyAction }: { credentials: CertificationItem[]; empty: string; emptyAction?: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  if (credentials.length === 0)
    return (
      <>
        <p className="text-[13.5px] text-ink-2">{empty}</p>
        {emptyAction}
      </>
    );
  // L-E057: Panameer-issued certificates stand apart as gradient badges; self-added ones keep the plain chips.
  const panameer = credentials.filter((c) => c.issuedFrom === "LEARN");
  const own = credentials.filter((c) => c.issuedFrom !== "LEARN");
  const groups = CREDENTIAL_KINDS.map((k) => ({ ...k, items: own.filter((c) => (c.kind ?? "CERTIFICATION") === k.key) })).filter((g) => g.items.length);
  return (
    <div data-credentials>
      {panameer.length > 0 && (
        <div data-panameer-certificates className="mb-4">
          <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">Panameer Certificates</p>
          <div className="flex flex-wrap gap-2">
            {panameer.map((c, i) => (
              <a
                key={c.id ?? `p-${i}`}
                href={c.credentialId ? `/verify/${c.credentialId}` : c.publicUrl ?? "#"}
                title="Issued by Panameer after passing the test."
                data-panameer-badge
                className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 text-white shadow-sm hover:brightness-110"
                style={{ background: BRAND_GRADIENT }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/panameer-mark-32.png" alt="" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate text-[12.5px] font-bold">{c.name}</span>
                {day(c.issuedOn) && <span className="shrink-0 text-[11px] text-white/75">{day(c.issuedOn)}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.key} data-credential-kind={g.key} className="mb-3 last:mb-0">
          <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((c, i) => {
              const id = c.id ?? `${g.key}-${i}`;
              const verified = c.issuedFrom === "LEARN";
              const expired = isExpired(c);
              return (
                <span key={id} className="relative">
                  <button
                    type="button"
                    data-row
                    data-verified={verified || undefined}
                    data-expired={expired || undefined}
                    aria-expanded={open === id}
                    onClick={() => setOpen(open === id ? null : id)}
                    className={(verified ? VERIFIED_CHIP : CLEAN_CHIP) + (expired ? " opacity-50" : "")}
                  >
                    {verified && <span aria-label="Verified by Panameer">✓</span>}
                    {c.name}
                  </button>
                  {open === id && <CredentialPopover c={c} verified={verified} expired={expired} onClose={() => setOpen(null)} />}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CredentialPopover({ c, verified, expired, onClose }: { c: CertificationItem; verified: boolean; expired: boolean; onClose: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const issued = day(c.issuedOn) ?? (c.year ? String(c.year) : null);
  const link = c.url || c.publicUrl || (verified && c.credentialId ? `/verify/${c.credentialId}` : null);
  const facts = [
    ["Issuer", c.issuer],
    ["Issued", issued],
    ["Expires", day(c.expiresOn)],
    ["Credential ID", c.credentialId],
  ].filter(([, v]) => v);
  return (
    <span ref={ref} role="dialog" aria-label={c.name} data-credential-popover className="absolute left-0 top-full z-30 mt-1.5 block w-[280px] border border-ink bg-surface p-3 text-left shadow-lg">
      <b className="block text-[14px] leading-snug">{c.name}</b>
      <span className="mt-0.5 block text-[11.5px] font-semibold text-ink-3">
        {verified ? "Verified by Panameer" : "Self-reported"}
        {expired && <span className="ml-1.5 font-bold text-magenta-dark">· Expired</span>}
      </span>
      {facts.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12.5px]">
          {facts.map(([k, v]) => (
            <span key={k} className="contents">
              <dt className="text-ink-3">{k}</dt>
              <dd className="break-words">{v}</dd>
            </span>
          ))}
        </dl>
      )}
      {c.notes && <span className="mt-2 block whitespace-pre-line text-[12.5px] text-ink-2">{c.notes}</span>}
      <span className="mt-2 flex flex-wrap gap-3 text-[12.5px] font-bold">
        {link && <a href={link} target="_blank" rel="noreferrer" className="text-magenta hover:text-magenta-dark">View Credential</a>}
        {c.attachmentName && <span className="font-normal text-ink-2">📎 {c.attachmentName}</span>}
      </span>
    </span>
  );
}
