"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ── ⚠⚠ START A GROUP — THE FORM (`P2-A3-E619` WS-A 4) ───────────────────
 *
 * ⚠ SCOTT, RULING 2: *"Anyone can start a group."* ⚠⚠ There is exactly ONE of
 * these on the page: the hero's button is an anchor to this card, not a second
 * copy of the form. **Two forms writing one table is `E585` in the browser.**
 *
 * ⚠⚠⚠ NO TYPE PICKER AND NO PRICE FIELD, DELIBERATELY. `createGroup` refuses
 * both, and the reasons are on it: a `REQUEST` group would strand joiners in
 * `PENDING` with no approval queue to release them, and a price cannot be
 * collected because nothing in the codebase creates a `Payment`. ⚠ A field
 * whose value the writer discards is a promise the form cannot keep.
 */
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
    /*
      ⚠⚠⚠ `try` / `catch` / `finally`, AND THE `catch` IS THE POINT. `E516`
      recorded five blocks in this codebase with `try`/`finally` and NO `catch`,
      where a thrown fetch produces silence — the member clicks, nothing
      happens, and nothing explains why. ⚠ A network failure says so here.
    */
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
      /* ⚠ Straight into the room they just made — a create that leaves you on
         the page you started from reads as though nothing happened. */
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
        className="w-full rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Starting your group…" : "Start a Group"}
      </button>
    </form>
  );
}
