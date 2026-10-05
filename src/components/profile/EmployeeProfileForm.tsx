"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CompanyLink } from "@/components/company/CompanyLink";

export function EmployeeProfileForm({
  firstName,
  lastName,
  title,
  phone,
  email,
  company,
  companyId,
  photoUrl,
}: {
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  email: string;
  company: string;
  companyId: string | null;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName, title, phone });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/settings/person", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(body.error ?? "Could not save that.");
        return;
      }
      setMsg("Saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const upload = async (f: File) => {
    setBusy(true);
    setErr(null);
    try {
      const body = new FormData();
      body.append("file", f);
      const r = await fetch("/api/profile/photo", { method: "POST", body });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data.error ?? "Could not upload that image.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-[12px] border border-line bg-white px-4 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-magenta";

  return (
    <div className="mt-5 rounded-brand border border-line bg-white p-6">
      <h2 className="font-display text-[19px] font-bold">Your Details</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
          First name
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={field}
          />
        </label>
        <label className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
          Last name
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={field}
          />
        </label>
        <label className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
          Title
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Platform Administrator"
            className={field}
          />
        </label>
        <label className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
          Phone
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={field}
          />
        </label>
      </div>

      {}
      <div className="mt-4 grid gap-4 text-[14px] sm:grid-cols-2">
        <p>
          <span className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
            Email
          </span>
          {email || "—"}
        </p>
        <p>
          <span className="block text-[13px] font-bold uppercase tracking-wide text-ink-2">
            Company
          </span>
          {company ? <CompanyLink id={companyId} name={company} /> : "—"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={busy}
          className="border-[1.5px] border-line px-5 py-2.5 text-[14px] font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
        >
          {photoUrl ? "Replace photo" : "Add a photo"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="ml-auto bg-magenta px-7 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      {msg && <p className="mt-3 text-[13.5px] font-semibold text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-[13.5px] text-red-700">{err}</p>}
    </div>
  );
}
