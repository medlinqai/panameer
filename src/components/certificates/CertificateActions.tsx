"use client";

import { useState } from "react";
import { linkedInAddUrl, linkedInShareUrl, verifyUrl } from "@/lib/certificate-links";

const BTN_K = "inline-flex min-h-11 items-center justify-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover";
const BTN = "inline-flex min-h-11 items-center justify-center border border-ink px-4 text-[14px] font-semibold hover:bg-surface-hover";
const SM_K = "inline-flex min-h-9 items-center justify-center bg-ink px-3 text-[12.5px] font-semibold text-surface hover:bg-ink-hover";
const SM = "inline-flex min-h-9 items-center justify-center border border-ink px-3 text-[12.5px] font-semibold hover:bg-surface-hover";

// L-E056/L-E058/L-E060: Add to LinkedIn (one click), Share Post, Download (PNG + PDF), Copy Link, View on Your Profile.
export function CertificateActions({ title, credentialId, issuedOn, profileHref, compact = false }: { title: string; credentialId: string; issuedOn: string; profileHref?: string | null; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const k = compact ? SM_K : BTN_K;
  const b = compact ? SM : BTN;
  return (
    <div data-certificate-actions className="flex flex-wrap items-center gap-2">
      <a href={linkedInAddUrl({ title, credentialId, issuedOn })} target="_blank" rel="noopener noreferrer" data-add-linkedin className={k}>Add to LinkedIn</a>
      <a href={linkedInShareUrl(credentialId)} target="_blank" rel="noopener noreferrer" className={b}>Share Post</a>
      <a href={`/api/certificates/${credentialId}/image?download=1`} className={b}>Download PNG</a>
      <a href={`/api/certificates/${credentialId}/pdf`} className={b}>PDF</a>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(verifyUrl(credentialId)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard refused */ } }} className={b}>{copied ? "Copied ✓" : "Copy Link"}</button>
      {profileHref && <a href={profileHref} className={b}>View on Your Profile</a>}
    </div>
  );
}
