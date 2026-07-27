"use client";

import { useRef, useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";

/**
 * A certification is STANDALONE (brief_U / E044): it belongs to the certifying
 * agency that issued it, never to an employer. Final field set below.
 */
export type CertificationDraft = {
  name: string;
  /** The certifying agency / issuing body. */
  issuer: string | null;
  /** Legacy year-only; `issuedOn` is the real issue date. */
  year: number | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  credentialId?: string | null;
  url?: string | null;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  notes?: string | null;
};

/** Add / edit / remove certifications. */
export function CertificationsEditor({
  value,
  onChange,
}: {
  value: CertificationDraft[];
  onChange: (next: CertificationDraft[]) => void;
}) {
  const upd = (i: number, patch: Partial<CertificationDraft>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      {value.map((c, i) => (
        <div key={i} className="rounded-brand border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Certification">
              <TextInput
                value={c.name}
                onChange={(e) => upd(i, { name: e.target.value })}
                placeholder="e.g. Oracle Cloud Procurement Certified"
              />
            </Field>
            <Field label="Certifying Agency">
              <TextInput
                value={c.issuer ?? ""}
                onChange={(e) => upd(i, { issuer: e.target.value })}
                placeholder="e.g. Oracle"
              />
            </Field>
            <Field label="Issued">
              <TextInput
                type="date"
                value={c.issuedOn ?? ""}
                onChange={(e) => upd(i, { issuedOn: e.target.value || null })}
              />
            </Field>
          </div>

          {/* Credential fields (brief_T / E040) — optional; a verify link is
              what turns a claimed certification into a checkable one. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Credential ID">
              <TextInput
                value={c.credentialId ?? ""}
                onChange={(e) => upd(i, { credentialId: e.target.value })}
                placeholder="Optional"
              />
            </Field>
            <Field label="Verify URL">
              <TextInput
                type="url"
                value={c.url ?? ""}
                onChange={(e) => upd(i, { url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Expires">
              <TextInput
                type="date"
                value={c.expiresOn ?? ""}
                onChange={(e) => upd(i, { expiresOn: e.target.value || null })}
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Notes">
              <TextInput
                value={c.notes ?? ""}
                onChange={(e) => upd(i, { notes: e.target.value || null })}
                placeholder="Optional"
              />
            </Field>
          </div>

          <div className="mt-3">
            <CertificationAttachment
              value={{ path: c.attachmentPath ?? null, name: c.attachmentName ?? null }}
              onChange={(a) =>
                upd(i, { attachmentPath: a.path, attachmentName: a.name })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="mt-3 text-[13px] font-bold text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            {
              name: "",
              issuer: "",
              year: null,
              issuedOn: null,
              expiresOn: null,
              credentialId: null,
              url: null,
              attachmentPath: null,
              attachmentName: null,
              notes: null,
            },
          ])
        }
        className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
      >
        + Add Certification
      </button>
    </div>
  );
}

/**
 * Upload the certificate itself (brief_U / E044). Stored in the PRIVATE
 * `certifications` bucket — a certificate carries a full name and credential
 * number — so what comes back is an object PATH, not a public URL.
 */
function CertificationAttachment({
  value,
  onChange,
}: {
  value: { path: string | null; name: string | null };
  onChange: (a: { path: string | null; name: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/provider/certification-file", {
        method: "POST",
        body,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Could not upload that file.");
        return;
      }
      onChange({ path: data.path, name: data.name });
    } catch {
      setError("Could not upload that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-[14px] font-bold text-ink">
        Certificate
      </span>
      {value.path ? (
        <div className="flex items-center gap-3 text-[14px]">
          <span className="truncate font-semibold">{value.name ?? "Attached"}</span>
          <button
            type="button"
            onClick={() => onChange({ path: null, name: null })}
            className="text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Attach PDF or Image"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {error && (
        <p className="mt-1.5 text-[13px] text-red-700">{error}</p>
      )}
    </div>
  );
}
