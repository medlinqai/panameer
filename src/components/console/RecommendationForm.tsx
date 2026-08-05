"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * What the CONTACT fills in (J2.4 WS-F / E012).
 *
 * Three fields, one of them required. A recommendation is a favour, and every
 * extra box is a reason to close the tab — title and company are asked because
 * "Programme Director, Fujitsu" is what makes the quote carry weight to a
 * buyer, but neither is enforced.
 *
 * DECLINE IS A REAL BUTTON, not an absence. The email's "No thanks" lands here
 * with `?decline=1`, and recording it means the provider sees an answer instead
 * of waiting indefinitely on someone who has already decided.
 */
export function RecommendationForm({
  token,
  providerName,
  startDeclined,
  invite,
}: {
  token: string;
  providerName: string;
  startDeclined: boolean;
  invite: boolean;
}) {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"submitted" | "declined" | null>(null);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/recommendations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...payload }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "We couldn't record that.");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-brand border border-emerald-500/30 bg-emerald-50/60 p-5">
        <p className="text-[15.5px] font-bold text-emerald-800">
          {done === "submitted"
            ? "Thank you — that's been sent."
            : "Understood, nothing has been shared."}
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
          {done === "submitted"
            ? `${providerName} will see your recommendation on their profile.`
            : `${providerName} has been told you'd rather not, and won't be prompted to ask again.`}
        </p>
        {invite && (
          <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
            Do this kind of work yourself?{" "}
            <Link href="/join" className="font-semibold text-magenta hover:underline">
              Create your own profile on Panameer
            </Link>{" "}
            — it takes a few minutes.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-[13px] font-bold">
          Your recommendation
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          maxLength={2000}
          placeholder={`What was ${providerName} like to work with? A few sentences is plenty.`}
          className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-magenta"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold">
            Your title <span className="font-normal text-ink-2">(optional)</span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Programme Director"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold">
            Your company <span className="font-normal text-ink-2">(optional)</span>
          </span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={160}
            placeholder="Fujitsu"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy || body.trim().length < 20}
          onClick={async () => {
            if (await post({ body, title, company })) setDone("submitted");
          }}
          className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send Recommendation"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await post({ decline: true })) setDone("declined");
          }}
          className={
            "text-[14px] font-semibold underline underline-offset-4 hover:text-magenta " +
            (startDeclined ? "text-ink" : "text-ink-2")
          }
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
