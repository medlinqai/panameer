"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompanyRequests({
  requests,
}: {
  requests: {
    id: string;
    name: string;
    email: string;
    title: string | null;
    company: string;
    askedAt: string;
    matched?: string | null;
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setBusy(id);
    setError(null);
    try {
      const r = await fetch("/api/company/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: id, decision }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Could not save that decision.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3">
      {error && (
        <p className="mb-3 text-[13px] font-semibold text-magenta-dark">
          {error}
        </p>
      )}
      <ul>
        {requests.map((r) => (
          <li key={r.id} data-join-request className="grid grid-cols-[40px_1fr] items-center gap-3 border-b border-line/60 py-3 sm:grid-cols-[40px_1fr_auto]">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#cfc9db] text-[13px] font-bold text-ink">
              {r.name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?"}
            </span>
            <span className="min-w-0">
              <b className="block text-[14.5px]">{r.name || "(unnamed)"}</b>
              <span className="block text-[12.5px] text-ink-3">
                {r.email}
                {r.title ? ` · ${r.title}` : ""} · asked{" "}
                {new Date(r.askedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
                {r.matched && <span data-matched> · matched on {r.matched}</span>}
              </span>
            </span>
            <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, "REJECTED")}
                className="border border-ink bg-surface px-3 py-[7px] text-[12.5px] font-bold text-ink hover:bg-surface-hover disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, "APPROVED")}
                className="border border-ink bg-ink px-3 py-[7px] text-[12.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50"
              >
                {busy === r.id ? "Saving…" : "Approve"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
