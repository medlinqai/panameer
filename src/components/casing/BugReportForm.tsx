"use client";

import { useState } from "react";
import Link from "next/link";
import type { SupportApplication } from "@/lib/support-applications";

/**
 * Bug report (`P2-J1.1-E032`) — now files a real ticket.
 *
 * ── ⚠⚠ WHAT THIS REPLACED, AND ONE CORRECTION TO THE BRIEF ──────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted: *"The brief scopes the ticketing backend
 * out, so this does not pretend to file anything. It captures the report, tells
 * the truth about where it goes… Wiring `POST /api/support/bug` is the only
 * change needed when the backend lands."*
 *
 * ⚠⚠ THE OLD FORM WAS HONEST, AND THE BRIEF SAYS OTHERWISE. It called this *"the
 * worst instance of the `P1-ALL-E034` class — a submit button that swallows a
 * bug report tells the user their report was received when nothing was
 * stored."* THAT IS NOT WHAT THE CODE DID: it rendered *"Not filed — there's no
 * bug tracker yet"* and handed the text back to copy. It was the E034 REMEDY,
 * not the defect. The real problem was smaller and still real — reports went
 * nowhere and nobody could reply — and that is what this fixes. Recorded so the
 * next reader does not go looking for a lie that was never told.
 *
 * ⚠ THE FORM GREW because one textarea cannot fill a ticket: triage needs to
 * know WHERE it happened, HOW BAD it is, and how to REPRODUCE it. Kept as light
 * as that allows — `title`, `where`, `what happened` and a priority default that
 * most reporters will never touch.
 * ⚠ THE SCREENSHOT IS OPTIONAL and its failure is reported ALONGSIDE a
 * successful filing, never instead of it.
 */
export function BugReportForm({ applications }: { applications: SupportApplication[] }) {
  const [title, setTitle] = useState("");
  const [application, setApplication] = useState("");
  const [description, setDescription] = useState("");
  const [howFound, setHowFound] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filed, setFiled] = useState<{ code: string; screenshotError: string | null } | null>(null);

  const ready = title.trim().length > 2 && description.trim().length > 2 && !!application;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("title", title);
      body.set("application", application);
      body.set("description", description);
      body.set("howFound", howFound);
      body.set("priority", priority);
      if (file) body.set("screenshot", file);

      const r = await fetch("/api/support/tickets", { method: "POST", body });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "Could not file that ticket.");
        return;
      }
      setFiled({ code: out.ticketCode, screenshotError: out.screenshotError ?? null });
    } finally {
      setBusy(false);
    }
  }

  if (filed) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-brand border-2 border-magenta/40 bg-magenta/[0.04] p-6">
          <p className="text-[16px] font-bold">Filed — thank you.</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Your ticket is{" "}
            {/* ⚠ THE CODE IS SHOWN BECAUSE IT IS WHAT A PERSON QUOTES BACK. */}
            <b className="font-mono text-ink">{filed.code}</b>. You&apos;ll see any
            reply on your{" "}
            <Link href="/support/tickets" className="font-semibold text-magenta underline">
              support tickets
            </Link>{" "}
            page.
          </p>
          {filed.screenshotError && (
            <p className="mt-3 text-[13.5px] text-amber-700">{filed.screenshotError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Report a Bug</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        What went wrong, and what were you doing when it happened?
      </p>

      {error && (
        <div className="mt-4 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}

      <label className="mt-5 block text-[14px] font-semibold">Title *</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Publish button does nothing"
        className="mt-1 w-full rounded-[12px] border border-line bg-white p-3 text-[15px] outline-none focus:border-magenta"
      />

      {/* ⚠ THE REPORTER'S OWN RAIL, plus Onboarding and Other — see
          `lib/support-applications.ts` for why it is derived, not written. */}
      <label className="mt-4 block text-[14px] font-semibold">Where did it happen? *</label>
      <select
        value={application}
        onChange={(e) => setApplication(e.target.value)}
        className="mt-1 w-full rounded-[12px] border border-line bg-white p-3 text-[15px] outline-none focus:border-magenta"
      >
        <option value="">Choose…</option>
        {applications.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-[14px] font-semibold">What happened? *</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        placeholder="I clicked Publish and…"
        className="mt-1 w-full rounded-[12px] border border-line bg-white p-3 text-[15px] outline-none focus:border-magenta"
      />

      <label className="mt-4 block text-[14px] font-semibold">
        How can we reproduce it? <span className="font-normal text-ink-2">(optional)</span>
      </label>
      <textarea
        value={howFound}
        onChange={(e) => setHowFound(e.target.value)}
        rows={3}
        placeholder="Sign in as a buyer, open Shop, then…"
        className="mt-1 w-full rounded-[12px] border border-line bg-white p-3 text-[15px] outline-none focus:border-magenta"
      />

      <label className="mt-4 block text-[14px] font-semibold">How bad is it?</label>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="mt-1 w-full rounded-[12px] border border-line bg-white p-3 text-[15px] outline-none focus:border-magenta"
      >
        <option value="Low">Low — cosmetic</option>
        <option value="Medium">Medium — annoying, I can work around it</option>
        <option value="High">High — I can&apos;t finish what I came to do</option>
        <option value="Urgent">Urgent — something is broken for everyone</option>
      </select>

      <label className="mt-4 block text-[14px] font-semibold">
        Screenshot <span className="font-normal text-ink-2">(optional)</span>
      </label>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mt-1 w-full text-[14px]"
      />
      <p className="mt-1 text-[13px] text-ink-2">
        Only the Panameer team can open it — screenshots are stored privately.
      </p>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={submit}
        className="mt-5 rounded-full bg-magenta px-7 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
      >
        {busy ? "Filing…" : "Submit"}
      </button>
    </div>
  );
}
