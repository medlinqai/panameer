"use client";

/**
 * ── EDIT & FIX (`P2-ALL-E796`) ──────────────────────────────────────────────
 *
 * ⚠ **SCOTT:** name, email, roles, verify, lock, deactivate, password reset —
 * from the app, not from a script.
 *
 * ⚠⚠⚠ **THE TWO DESTRUCTIVE-ADJACENT ACTIONS ASK FIRST.** Lock and deactivate
 * lock a real person out of their own account, so each one turns into a
 * two-step: a question with the consequence spelled out, then the action. ⚠ The
 * server refuses an unconfirmed call as well — this is the second of two gates.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "inline-flex min-h-11 items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 = "inline-flex min-h-11 items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";
const FIELD = "min-h-11 w-full border border-line bg-surface px-2 text-[14px] text-ink";

export type UserEditState = {
  personId: string;
  hasAccount: boolean;
  first: string;
  last: string;
  email: string;
  verified: boolean;
  locked: boolean;
  active: boolean;
  buyer: boolean;
  provider: boolean;
  coordinator: boolean;
};

export function UserEditPanel({ state }: { state: UserEditState }) {
  const router = useRouter();
  const [first, setFirst] = useState(state.first);
  const [last, setLast] = useState(state.last);
  const [email, setEmail] = useState(state.email);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** ⚠ Which question is open, if any. One at a time — two confirmations on
   *  screen is how the wrong one gets clicked. */
  const [asking, setAsking] = useState<"lock" | "deactivate" | null>(null);

  async function call(action: string, extra: Record<string, unknown> = {}, note?: string) {
    setBusy(action);
    setError(null);
    setSaid(null);
    try {
      const res = await fetch("/api/admin/user-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, personId: state.personId, ...extra }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "That didn’t work.");
        return null;
      }
      setSaid(note ?? "Saved.");
      setAsking(null);
      router.refresh();
      return json;
    } catch {
      setError("Couldn’t reach the server.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    /*
      ── ⚠⚠⚠ NO CARD AND NO HEADING OF ITS OWN (`P2-ALL-E796`) ───────────────
      ⚠ **CAUGHT BY ITS OWN BROWSER TEST, which found TWO `Edit & fix` headings
      on the page.** This component is mounted inside the page's `Section`, which
      already draws the card and writes the heading and the note — so a heading
      here was a duplicate in the accessibility tree and a bordered card inside a
      bordered card.
      ⚠⚠ **THE WRAPPER IS THE PAGE'S JOB.** Every other block on that page is a
      `Section`, and a component that drew its own chrome would be the one that
      looked different for no reason.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   <section className="rounded-brand border border-line bg-white p-5">
      //     <h2 ...>Edit &amp; fix</h2>
    */
    <div>
      {!state.hasAccount && (
        <p className="mt-2 text-[13px] text-ink-2">
          {/* ⚠⚠ A person row with no user account cannot be locked, verified or
              reset. Saying so beats offering controls that would refuse. */}
          This person has no sign-in account, so only their name and roles can be
          changed here.
        </p>
      )}

      {/* ── name ───────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label>
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">First name</span>
          <input value={first} onChange={(e) => setFirst(e.target.value)} className={FIELD} />
        </label>
        <label>
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Last name</span>
          <input value={last} onChange={(e) => setLast(e.target.value)} className={FIELD} />
        </label>
        <button
          type="button"
          className={BTN_2 + " self-end"}
          disabled={disabled || (first === state.first && last === state.last)}
          onClick={() => void call("name", { first, last }, "Name saved.")}
        >
          Save Name
        </button>
      </div>

      {/* ── email ──────────────────────────────────────────────────────── */}
      {state.hasAccount && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label>
            <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">
              Email {state.verified ? "· verified" : "· not verified"}
            </span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
          </label>
          <button
            type="button"
            className={BTN_2 + " self-end"}
            disabled={disabled || email.trim().toLowerCase() === state.email.toLowerCase()}
            /** ⚠⚠⚠ THE CONSEQUENCE IS IN THE LABEL, not in a tooltip: changing
             *  the address un-verifies it and sends a fresh verification. */
            onClick={() => void call("email", { email }, "Email changed — verification sent, and the address is now unverified.")}
          >
            Change Email
          </button>
          {!state.verified && (
            <button
              type="button"
              className={BTN_2 + " self-end"}
              disabled={disabled}
              onClick={() => void call("verify", {}, "Marked verified — recorded as an admin override.")}
            >
              Mark Verified
            </button>
          )}
        </div>
      )}

      {/* ── roles ──────────────────────────────────────────────────────── */}
      <fieldset className="mt-4">
        <legend className="text-[11px] uppercase tracking-[0.08em] text-ink-2">Roles</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {([
            ["buyer", "Buyer", state.buyer],
            ["provider", "Provider", state.provider],
            ["coordinator", "Recruiter", state.coordinator],
          ] as const).map(([key, label, on]) => (
            <label key={key} className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
              <input
                type="checkbox"
                defaultChecked={on}
                disabled={disabled}
                onChange={(e) => void call("roles", { [key]: e.target.checked }, `${label} ${e.target.checked ? "added" : "removed"}.`)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── the account controls ───────────────────────────────────────── */}
      {state.hasAccount && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-2">
            Account · {state.active ? "active" : "deactivated"}
            {state.locked ? " · locked" : ""}
          </p>

          {asking === null && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={BTN_2} disabled={disabled}
                onClick={() => (state.locked ? void call("lock", { locked: false }, "Unlocked.") : setAsking("lock"))}>
                {state.locked ? "Unlock" : "Lock"}
              </button>
              <button type="button" className={BTN_2} disabled={disabled}
                onClick={() => (state.active ? setAsking("deactivate") : void call("active", { active: true, confirmed: true }, "Reactivated."))}>
                {state.active ? "Deactivate" : "Reactivate"}
              </button>
              <button type="button" className={BTN_2} disabled={disabled}
                onClick={() => void call("reset", {}, "Password reset email sent.")}>
                Send Password Reset
              </button>
            </div>
          )}

          {asking !== null && (
            <div className="mt-2 flex flex-wrap items-center gap-3 border-l-2 border-magenta pl-3">
              <span className="text-[13px] text-ink">
                {/* ⚠⚠ THE CONSEQUENCE, IN WORDS, BEFORE THE CLICK. */}
                {asking === "lock"
                  ? "Locking signs this person out and blocks sign-in until you unlock it."
                  : "Deactivating signs this person out and hides them from members. Nothing is deleted."}
              </span>
              <button type="button" className={BTN} disabled={disabled}
                onClick={() =>
                  void call(
                    asking === "lock" ? "lock" : "active",
                    asking === "lock" ? { locked: true, confirmed: true } : { active: false, confirmed: true },
                    asking === "lock" ? "Locked." : "Deactivated — no rows were removed.",
                  )
                }
              >
                {asking === "lock" ? "Yes, Lock It" : "Yes, Deactivate"}
              </button>
              <button type="button" className={BTN_2} onClick={() => setAsking(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {said && <p className="mt-3 text-[13px] font-bold text-ink">{said}</p>}
      {error && <p className="mt-3 text-[13px] font-bold text-magenta">{error}</p>}
      <p className="mt-3 text-[12.5px] text-ink-2">
        {/* ⚠ Said on screen because it is the lane's whole promise. */}
        Every change here is recorded in the audit log, with the value before and
        after. Nothing on this page deletes a real account.
      </p>
    </div>
  );
}
