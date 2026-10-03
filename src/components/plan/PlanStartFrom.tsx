"use client";

/**
 * ── START FROM — BLANK · TEMPLATE · COPY (`P2-ALL-E784`) ────────────────────
 *
 * ⚠⚠ **IT ONLY OFFERS WHAT IT CAN DO.** The template and copy actions REFUSE a
 * plan that already has rows (`store.ts`/`template.ts`), so when the plan is
 * non-empty this renders the clearing path instead of buttons that would come
 * back with an error. ⚠ A control that is certain to fail is worse than no
 * control — and a control that silently merged would be unrecoverable by hand.
 *
 * ⚠⚠ **IMPORT IS ALWAYS OFFERED, UNLIKE THE TEMPLATE** — it is the only path
 * that works on a plan that already has rows, because the person chooses
 * `replace` or `append` rather than the server guessing.
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "inline-flex min-h-11 items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 = "inline-flex min-h-11 items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";

export function PlanStartFrom({
  ownerKey,
  hasRows,
  endpoint = "/api/admin/plan",
}: {
  ownerKey: string;
  hasRows: boolean;
  endpoint?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** ⚠⚠ Clearing a plan is confirmed IN PAGE, in two steps. There is no undo for
   *  it — `deleteRow`'s buffer holds one row and its children, not a whole plan
   *  — so the second click is the only thing standing between Scott and his own
   *  work. ⚠ Saying that plainly is part of the control. */
  const [confirmClear, setConfirmClear] = useState(false);
  /** ⚠⚠⚠ NO DEFAULT, AND THAT IS THE DESIGN. "Add to the plan" and "delete the
   *  plan and use this file" are not variations of one another, and a
   *  pre-selected radio is how somebody loses two hundred rows to one click.
   *  ⚠ The Import button stays disabled until this is answered. */
  const [mode, setMode] = useState<"replace" | "append" | null>(null);
  const [problems, setProblems] = useState<{ line: number; message: string }[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerKey, action, ...extra }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "That didn’t work.");
        return;
      }
      setConfirmClear(false);
      router.refresh();
    } catch {
      setError("Couldn’t reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !mode) return;
    setBusy("import");
    setError(null);
    setProblems([]);
    setResult(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("mode", mode);
      body.set("ownerKey", ownerKey);
      const res = await fetch(`${endpoint}/import`, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        written?: number;
        replaced?: number;
        problems?: { line: number; message: string }[];
      };
      /** ⚠⚠ THE PER-ROW REASONS ARE SHOWN ON FAILURE **AND** ON SUCCESS. A
       *  partial import — 39 of 40 rows — is a result, and the one row that did
       *  not make it is the only thing the person needs to act on. */
      setProblems(json.problems ?? []);
      if (!res.ok) {
        setError(json.error ?? "We couldn't read that file.");
        return;
      }
      setResult(
        `Imported ${json.written} row${json.written === 1 ? "" : "s"}` +
          (json.replaced ? `, replacing ${json.replaced}` : "") +
          ".",
      );
      if (fileRef.current) fileRef.current.value = "";
      setMode(null);
      router.refresh();
    } catch {
      setError("Couldn\u2019t reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-line bg-bg-soft p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Start from</p>
      {hasRows ? (
        <>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
            This plan already has rows, so the template and copy options are off — they would
            either merge into your work or replace it. Clear the plan first if you want to start
            again.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmClear ? (
              <>
                <span className="text-[13px] font-bold text-magenta">
                  Delete every row in this plan? There is no undo for this.
                </span>
                <button type="button" className={BTN} disabled={busy !== null} onClick={() => void run("clear")}>
                  {busy === "clear" ? "Clearing…" : "Yes, Clear the Plan"}
                </button>
                <button type="button" className={BTN_2} onClick={() => setConfirmClear(false)}>
                  Keep It
                </button>
              </>
            ) : (
              <button type="button" className={BTN_2} onClick={() => setConfirmClear(true)}>
                Clear the Plan
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
            Type your own rows below, or start from the Panameer template — seven phases, the ten
            journeys under Build, and the dates already in the tracker. Everything in it is yours to
            edit or delete.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={BTN} disabled={busy !== null} onClick={() => void run("template")}>
              {busy === "template" ? "Building…" : "Use the Panameer Template"}
            </button>
          </div>
        </>
      )}
      {/* ── IMPORT ─────────────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
          Or import a spreadsheet
        </p>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
          Excel (.xlsx) or CSV, up to 2&nbsp;MB.{" "}
          <a href={`${endpoint}/template`} className="underline">
            Download the Panameer template
          </a>{" "}
          — Level, Title, Type, Start, End, Status, Owner, Hours. A row we can&apos;t read is
          skipped and listed below; the rest still import.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          aria-label="Plan spreadsheet"
          className="mt-3 block w-full text-[13px] text-ink file:mr-3 file:min-h-11 file:rounded-[4px] file:border file:border-ink file:bg-surface file:px-3 file:text-[13px] file:font-bold file:text-ink"
        />

        <fieldset className="mt-3">
          <legend className="text-[13px] font-bold text-ink">What should it do?</legend>
          {/* ⚠ Neither is checked. The Import button is disabled until one is. */}
          <label className="mt-1.5 flex min-h-11 items-center gap-2 text-[14px] text-ink">
            <input
              type="radio"
              name="plan-import-mode"
              checked={mode === "append"}
              onChange={() => setMode("append")}
            />
            Add these rows to the plan
          </label>
          <label className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
            <input
              type="radio"
              name="plan-import-mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            Replace the plan with this file
            {hasRows && (
              <span className="text-[13px] font-bold text-magenta">— deletes every row you have now</span>
            )}
          </label>
        </fieldset>

        <button
          type="button"
          className={BTN + " mt-3"}
          disabled={busy !== null || mode === null}
          onClick={() => void upload()}
        >
          {busy === "import" ? "Reading the file…" : "Import the Plan"}
        </button>

        {result && <p className="mt-3 text-[13px] font-bold text-ink">{result}</p>}

        {problems.length > 0 && (
          <div className="mt-3 border-l-2 border-magenta pl-3">
            <p className="text-[13px] font-bold text-ink">
              {problems.length} row{problems.length === 1 ? "" : "s"} need{problems.length === 1 ? "s" : ""} a look
            </p>
            <ul className="mt-1 text-[13px] text-ink-2">
              {problems.map((p, i) => (
                <li key={`${p.line}-${i}`}>
                  Row {p.line}: {p.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[13px] font-bold text-magenta">{error}</p>}
    </div>
  );
}
