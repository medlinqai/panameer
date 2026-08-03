"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The Company Admin's pending-join queue (brief_company_model WS3).
 *
 * Approve / Reject only. Both are one click with no confirm dialog: approving
 * is reversible in effect (the person can be removed once member management
 * exists) and rejecting leaves the requester able to ask again or pick another
 * company, so neither is the kind of destructive action a modal is for.
 */
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
        <p className="mb-3 rounded-lg border border-red-600/20 bg-red-600/5 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-medium">{r.name || "(unnamed)"}</span>
              <span className="block text-sm text-black/60 dark:text-white/60">
                {r.email}
                {r.title ? ` · ${r.title}` : ""} · asked{" "}
                {new Date(r.askedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </span>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, "REJECTED")}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition-colors hover:border-black/35 disabled:opacity-50 dark:border-white/20 dark:hover:border-white/40"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, "APPROVED")}
                className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
