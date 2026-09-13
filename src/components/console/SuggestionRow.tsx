"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ONE ROW OF THE MODERATION QUEUE (`P1-A1.5-E482`).
 *
 * ⚠ THE ADMIN CHOOSES THE KIND HERE AND NOWHERE ELSE. A suggestion has none —
 * `onboarding.ts` no longer hard-codes `PRODUCT`, and the stored column value is
 * not a claim about what the row is. ⚠⚠ SO THE SELECT HAS NO SENSIBLE DEFAULT
 * AND DOES NOT PRETEND TO: Promote stays disabled until a kind is picked, which
 * is what makes this a judgement call rather than a rubber stamp.
 */
export function SuggestionRow({
  id,
  name,
  status,
  askedBy,
}: {
  id: string;
  name: string;
  status: "SUGGESTED" | "RETIRED";
  askedBy: number;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"" | "PRODUCT" | "METHODOLOGY" | "INDUSTRY">("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async (body: unknown) => {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const r = (await res.json().catch(() => ({ error: "That didn't save." }))) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (r.ok) {
      setNote(r.message ?? "Saved.");
      router.refresh();
    } else setNote(r.error ?? "That didn't save.");
  };

  return (
    <span className="flex flex-wrap items-center gap-2">
      <select
        className="rounded-[8px] border border-line bg-white px-2 py-1 text-[13px] outline-none focus:border-magenta"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        aria-label={`Kind for ${name}`}
      >
        <option value="">Choose a kind…</option>
        <option value="PRODUCT">Products &amp; Platforms</option>
        <option value="METHODOLOGY">Processes &amp; Methodologies</option>
        <option value="INDUSTRY">Industries</option>
      </select>
      <button
        type="button"
        disabled={busy || !kind}
        onClick={() => void run({ action: "spec.promote", id, kind })}
        className="rounded-full border-[1.5px] border-line px-3 py-1 text-[12.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta-ink disabled:cursor-not-allowed disabled:opacity-40"
        title={kind ? undefined : "Pick a kind first — a suggestion has none until you give it one."}
      >
        Promote
      </button>
      {/* ⚠ REJECT KEEPS THE RECORD — see `rejectSuggestion`. It is not a delete,
          which is why an already-rejected row still shows a Promote button. */}
      {status === "SUGGESTED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run({ action: "spec.reject", id })}
          className="rounded-full border-[1.5px] border-line px-3 py-1 text-[12.5px] font-bold text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          Reject
        </button>
      )}
      <span className="text-[11.5px] text-ink-2">
        {askedBy} {askedBy === 1 ? "provider" : "providers"} asked
      </span>
      {note && <span className="text-[12px] font-semibold text-magenta-ink">{note}</span>}
    </span>
  );
}
