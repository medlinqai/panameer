"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN =
  "inline-flex min-h-11 items-center bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 =
  "inline-flex min-h-11 items-center border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";

type Removable = { id: string; email: string; createdAt: string }[];

export function TestAccountControls({ filter }: { filter: "all" | "real" | "test" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [removable, setRemovable] = useState<Removable | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [expected, setExpected] = useState("");

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    setSaid(null);
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "That didn’t work.");
        return null;
      }
      return json;
    } catch {
      setError("Couldn’t reach the server.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 border border-line bg-bg-soft p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Test accounts</p>

      {/* ── the filter ─────────────────────────────────────────────────── */}
      <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px]">
        <span className="mr-1 text-ink-2">Show:</span>
        {(["all", "real", "test"] as const).map((f) => (
          <a
            key={f}
            href={f === "all" ? "?" : `?test=${f}`}
            className={
              "min-h-11 inline-flex items-center px-2.5 font-semibold " +
              (filter === f ? "bg-ink text-surface" : "text-ink-2 underline hover:text-ink")
            }
          >
            {f === "all" ? "All" : f === "real" ? "Real" : "Test"}
          </a>
        ))}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={BTN_2} disabled={busy !== null} onClick={async () => {
          const json = await call("create");
          if (!json) return;
          const created = (json.created as string[]) ?? [];
          const skipped = (json.skipped as string[]) ?? [];
          /** ⚠⚠ IT REPORTS BOTH HALVES. "Created 0, skipped 9" is the honest
           *  answer on a second press, and it is the one that tells Scott the
           *  set is already there rather than that nothing happened. */
          setSaid(
            `Created ${created.length}${created.length ? ` (${created.join(", ")})` : ""}` +
              (skipped.length ? ` · skipped ${skipped.length} that already exist` : ""),
          );
          router.refresh();
        }}>
          {busy === "create" ? "Creating…" : "Create Test Set"}
        </button>

        <button type="button" className={BTN_2} disabled={busy !== null} onClick={async () => {
          const json = await call("preview");
          if (!json) return;
          setRemovable((json.rows as Removable) ?? []);
          setExpected(String(json.confirmation ?? ""));
          setConfirmation("");
        }}>
          {busy === "preview" ? "Checking…" : "Remove Test Accounts…"}
        </button>
      </div>

      {/* ── the confirmation, with the full list ───────────────────────── */}
      {removable !== null && (
        <div className="mt-4 border-l-2 border-magenta pl-3">
          {removable.length === 0 ? (
            <p className="text-[13px] text-ink-2">There are no test accounts to remove.</p>
          ) : (
            <>
              <p className="text-[13px] font-bold text-ink">
                These {removable.length} accounts will be deleted, with everything attached to them:
              </p>
              {/* ⚠ EVERY address, not a count and not a sample — the brief says
                  "lists exactly what will go", and a truncated list is how a
                  surprise happens. */}
              <ul className="mt-1 max-h-48 overflow-y-auto text-[13px] text-ink-2">
                {removable.map((r) => (
                  <li key={r.id}>{r.email}</li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-ink-2">
                Type <span className="font-mono font-bold text-ink">{expected}</span> to confirm.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  aria-label="Type the confirmation phrase"
                  className="min-h-11 w-44 border border-line bg-surface px-2 font-mono text-[13px] text-ink"
                />
                <button
                  type="button"
                  className={BTN}
                  /** ⚠⚠ DISABLED UNTIL IT MATCHES — and the server checks again,
                   *  because a disabled button is not a guarantee. */
                  disabled={busy !== null || confirmation.trim() !== expected}
                  onClick={async () => {
                    const json = await call("remove", { confirmation });
                    if (!json) return;
                    setSaid(`Removed ${json.removed} test account(s).`);
                    setRemovable(null);
                    router.refresh();
                  }}
                >
                  {busy === "remove" ? "Removing…" : "Delete Them"}
                </button>
                <button type="button" className={BTN_2} onClick={() => setRemovable(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {said && <p className="mt-3 text-[13px] font-bold text-ink">{said}</p>}
      {error && <p className="mt-3 text-[13px] font-bold text-magenta">{error}</p>}
    </div>
  );
}
