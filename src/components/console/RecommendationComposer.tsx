"use client";

import { useState } from "react";

/**
 * The ask (J2.4 WS-F / E012).
 *
 * THE TEMPLATE IS PRE-FILLED AND EDITABLE, which is the whole "quick send"
 * idea: a provider staring at an empty box asking a former client for a favour
 * writes nothing, and a provider handed a note they can send as-is sends it.
 * They can rewrite every word, and most will change a line or two, which is
 * exactly the point — a template's job is to remove the blank page, not to
 * speak for them.
 *
 * `devLink` is surfaced when Resend isn't configured, the same affordance the
 * verification flows use: locally the loop stays walkable instead of silently
 * doing nothing.
 */
export function RecommendationComposer({
  defaultMessage,
  onSent,
}: {
  defaultMessage: string;
  onSent: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ devLink?: string; offPlatform: boolean } | null>(
    null
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: name, contactEmail: email, message }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "We couldn't send that.");
        return;
      }
      setSent({ devLink: data.devLink, offPlatform: !!data.offPlatform });
      setName("");
      setEmail("");
      setMessage(defaultMessage);
      onSent();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-brand border border-line bg-white p-5"
    >
      <h2 className="font-display text-[16px] font-bold">Ask for a Recommendation</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
        They don&apos;t need a Panameer account — they&apos;ll get an email with a
        link, and what they write appears in your Testimonials.
      </p>

      {error && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
          {error}
        </p>
      )}
      {sent && (
        <div className="mt-3 rounded-[10px] border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-[13.5px]">
          <p className="font-semibold text-emerald-800">
            Sent. You&apos;ll see it here when they reply.
          </p>
          {sent.offPlatform && (
            <p className="mt-1 text-ink-2">
              They&apos;re not on Panameer yet, so the email also invites them to
              create their own profile.
            </p>
          )}
          {sent.devLink && (
            <p className="mt-1 break-all text-ink-2">
              No email provider configured — link:{" "}
              <a className="font-semibold text-magenta" href={sent.devLink}>
                {sent.devLink}
              </a>
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold">Their name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="Dana Whitfield"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold">Their email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="dana@example.com"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 flex items-baseline justify-between text-[13px] font-bold">
          Your message
          <button
            type="button"
            onClick={() => setMessage(defaultMessage)}
            className="text-[12.5px] font-semibold text-magenta hover:underline"
          >
            Reset to template
          </button>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={9}
          maxLength={4000}
          className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send Request"}
      </button>
    </form>
  );
}
