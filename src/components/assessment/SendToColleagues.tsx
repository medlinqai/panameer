"use client";

import { useState } from "react";
import { PROCESSES } from "@/lib/assessment/questions-p2p";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";

/**
 * SEND THE OTHER ASSESSMENTS TO COLLEAGUES (WS-E) — the referral engine.
 *
 * ── IT SOLVES A REAL PROBLEM, NOT JUST GROWTH ────────────────────────────────
 *
 * The splitter asks for one process because one person does not know all four.
 * That is honest, and it leaves three quarters of the company unassessed. This
 * is where those three go — to the people who actually own them, invited by a
 * colleague rather than cold-emailed by a vendor.
 *
 * ── THE ONE ALREADY DONE IS MARKED DONE, NOT HIDDEN ──────────────────────────
 *
 * Their own process shows as "Done ✓" in the same row. Removing it would lose
 * the "full picture of the company" framing that makes the other three feel
 * like gaps worth filling.
 *
 * A client island, deliberately: it takes typed input and posts. The report
 * around it stays a server component.
 */
export function SendToColleagues({
  shareToken,
  companyName,
  done,
}: {
  shareToken: string;
  companyName: string;
  /** Processes already invited or already assessed. */
  done: string[];
}) {
  const [sent, setSent] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { name: string; email: string }>>({});

  const isDone = (key: string) => done.includes(key) || sent.includes(key);

  async function send(process: string) {
    const d = draft[process];
    if (!d?.name?.trim() || !d?.email?.trim()) return;
    setBusy(process);
    setError(null);
    try {
      const r = await fetch(`/api/assessment/${shareToken}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ process, name: d.name, email: d.email }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error ?? "Could not send that invite");
      setSent((s) => [...s, process]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that invite");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-10 rounded-brand border border-line bg-bg-soft p-6 sm:p-8">
      <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
        Want the full picture of {companyName}?
      </h2>
      <p className="mt-2 max-w-3xl text-[15px] text-ink-2">
        You covered one process. Each other one is best answered by the person who owns it
        — send them their assessment. An invite from you gets far more responses than a cold
        email from us.
      </p>

      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {PROCESSES.map((p) => {
          const finished = isDone(p.key);
          return (
            <div key={p.key} className="rounded-brand border border-line bg-white p-5">
              <p className="text-[16px] font-bold text-ink">{p.name}</p>
              <p className="mt-1 text-[14px] text-ink-2">{p.blurb}</p>

              {finished ? (
                <p className="mt-4 text-[14.5px] font-bold text-magenta">
                  {sent.includes(p.key) ? "Invite sent ✓" : "Done ✓"}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <Field label="Their name">
                    <TextInput
                      value={draft[p.key]?.name ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [p.key]: { ...(d[p.key] ?? { name: "", email: "" }), name: e.target.value },
                        }))
                      }
                      placeholder="Alex Rivera"
                    />
                  </Field>
                  <Field label="Their email">
                    <TextInput
                      type="email"
                      value={draft[p.key]?.email ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [p.key]: { ...(d[p.key] ?? { name: "", email: "" }), email: e.target.value },
                        }))
                      }
                      placeholder="alex@company.com"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => send(p.key)}
                    disabled={busy === p.key}
                    className="rounded-full border-[1.5px] border-line px-4 py-2 text-[14px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
                  >
                    {busy === p.key ? "Sending…" : "Send"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
