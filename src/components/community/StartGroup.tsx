"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartGroup() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "That didn't work. Try again.");
        return;
      }
      setTitle("");
      router.push(`/community/groups/${data.slug}`);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="new-group-title" className="sr-only">
        Group name
      </label>
      <input
        id="new-group-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="A topic, a region, alumni…"
        className="w-full rounded-brand border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-magenta"
      />
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-red-600">
          {error}
        </p>
      )}
      {/* ⚠⚠ RULE 11: the LABEL is Title Case, and the BUSY string is a status
          sentence, which stays a sentence. Scott, 2026-09-16: the test is
          whether it names an action or reports progress. */}
      <button
        type="submit"
        disabled={busy || title.trim().length < 3}
        className="w-full bg-ink px-4 py-2 text-[13.5px] font-semibold text-surface transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Starting your group…" : "Start a Group"}
      </button>
    </form>
  );
}
