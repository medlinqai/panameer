"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * THE CONNECT CONTROLS — one verb, two capacities (`P1-ALL-E374`).
 *
 * ── ⚠⚠ THE WORD `FOLLOW` APPEARS IN NO RENDERED STRING ────────────────────
 *
 * SCOTT, 2026-09-03: *"maybe we remove the word follow and capacity defines the
 * connection....i want to connect to you as a colleague...i want to connect to
 * her as a mentor."*
 *
 * ⚠ THE INTERNAL NAMES ARE DELIBERATELY UNCHANGED: `followMentor`,
 * `unfollowMentor` and the `"FOLLOWING"` relation literal stay exactly as
 * `E372` wrote them. Renaming them would churn `check:community` for no
 * user-visible gain, and the brief says so explicitly. The wire `action` values
 * (`mentor` / `unmentor`) are this route's own vocabulary, not the lib's.
 *
 * ── ⚠⚠ SINGLE-CLICK IS THE SPECIFICATION ─────────────────────────────────
 *
 * `E374`: *"No modal, no message box, no confirmation step. Building a
 * community must cost nothing."* ⚠ NOT EVEN `Decline` GETS A CONFIRM, and that
 * was checked against the consequence rather than assumed comfortable: a
 * DECLINED row is KEPT, not deleted, so a mis-click destroys no data, and the
 * person is still reachable through search. Nothing here is irreversible enough
 * to earn a dialog.
 *
 * ⚠ OPTIMISTIC, AND IT REVERTS OUT LOUD. The label changes on click and rolls
 * back with a visible message on failure — *"a button that does nothing for
 * 400ms gets clicked twice"*. `busy` also blocks the second click outright,
 * because optimism alone would still fire two requests.
 *
 * ── ⚠ THIS COMPONENT DECIDES NOTHING ─────────────────────────────────────
 *
 * The button it shows is a SWITCH ON `relation`, which `searchMembers` and
 * `getMyCommunity` already computed server-side in `lib/connections.ts`. There
 * is no rule here — no "can I connect to this person", no self-check, no
 * duplicate-check. All of that is in the lib where the harness can see it, and
 * the server re-checks every one of them on the way in.
 */

export type Relation = "PENDING" | "ACCEPTED" | "DECLINED" | "FOLLOWING" | null;

type Props = {
  toUserId: string;
  /** The colleague relation as the server computed it. */
  relation: Relation;
  /**
   * ⚠ Set when `relation === "PENDING"` and THEY sent it — the row is then
   * actionable by me, so the button is Accept rather than a disabled Requested.
   */
  incomingConnectionId?: string | null;
  /** Whether I have already connected to them as a mentor. */
  isMentor?: boolean;
  /** ⚠ Hidden entirely on your own row — the lib refuses SELF anyway. */
  isSelf?: boolean;
  /**
   * ⚠⚠ RENDER `Decline` BESIDE `Accept`. Set on the "Requests waiting on you"
   * block only. `E374`: *"Decline IS A REAL BUTTON, NOT A HIDDEN MENU ITEM."*
   * A decline is the true signal that protects what a colleague request means;
   * burying it produces silent ignores, which teach the platform nothing.
   */
  showDecline?: boolean;
};

const BTN =
  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-default";
const PRIMARY = `${BTN} bg-magenta text-white hover:bg-magenta/90 disabled:bg-ink-2/15 disabled:text-ink-2`;
const GHOST = `${BTN} border border-line text-ink-2 hover:border-magenta/50 hover:text-magenta`;
const QUIET = `${BTN} text-ink-2`;

export function ConnectControls({
  toUserId,
  relation,
  incomingConnectionId = null,
  isMentor = false,
  isSelf = false,
  showDecline = false,
}: Props) {
  const router = useRouter();
  const [rel, setRel] = useState<Relation>(relation);
  const [mentor, setMentor] = useState(isMentor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ⚠ A control you cannot press is noise, so your own row renders nothing. */
  if (isSelf) return null;

  async function send(body: Record<string, string>, optimistic: () => void, revert: () => void) {
    setBusy(true);
    setError(null);
    optimistic();
    try {
      const res = await fetch("/api/community/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        revert();
        setError(data?.error ?? "That didn't go through. Try again.");
        return;
      }
      /* ⚠ THE SERVER'S STATUS WINS OVER THE OPTIMISTIC GUESS. `requestColleague`
         accepts a REVERSE pending request rather than duplicating it, so a
         Connect click can legitimately come back ACCEPTED. Trusting the guess
         would show "Requested" for somebody who is already a colleague. */
      if (typeof data?.status !== "undefined" && body.action !== "mentor") {
        setRel(data.status as Relation);
      }
      router.refresh();
    } catch {
      revert();
      setError("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const connectColleague = () => {
    const before = rel;
    return send({ action: "colleague", toUserId }, () => setRel("PENDING"), () => setRel(before));
  };
  const accept = () => {
    const before = rel;
    return send(
      { action: "accept", connectionId: incomingConnectionId! },
      () => setRel("ACCEPTED"),
      () => setRel(before)
    );
  };
  const decline = () => {
    const before = rel;
    /* ⚠ SINGLE CLICK, NO CONFIRM — and that was checked against the consequence,
       not assumed comfortable. `declineColleague` UPDATES the row to DECLINED;
       it never deletes, so a mis-click destroys nothing. */
    return send(
      { action: "decline", connectionId: incomingConnectionId! },
      () => setRel("DECLINED"),
      () => setRel(before)
    );
  };
  const toggleMentor = () => {
    const before = mentor;
    return send(
      { action: mentor ? "unmentor" : "mentor", toUserId },
      () => setMentor(!before),
      () => setMentor(before)
    );
  };

  /* ── the colleague half: one button, chosen by `relation` ─────────────── */
  let colleagueControl: React.ReactNode = null;
  if (rel === null) {
    colleagueControl = (
      <button type="button" className={PRIMARY} disabled={busy} onClick={connectColleague}>
        Connect as colleague
      </button>
    );
  } else if (rel === "PENDING" && incomingConnectionId) {
    colleagueControl = (
      <button type="button" className={PRIMARY} disabled={busy} onClick={accept}>
        Accept
      </button>
    );
  } else if (rel === "PENDING") {
    /* ⚠ DISABLED, NOT HIDDEN — you asked, and you should be able to see that. */
    colleagueControl = (
      <button type="button" className={PRIMARY} disabled>
        Requested
      </button>
    );
  } else if (rel === "ACCEPTED") {
    colleagueControl = (
      <button type="button" className={PRIMARY} disabled>
        Colleague
      </button>
    );
  }
  /* ⚠ `DECLINED` FALLS THROUGH TO NOTHING, AND THAT IS THE DESIGN. `E372` keeps
     the row so the same request cannot be re-sent forever. Rendering an error
     would tell the sender they were declined, which is nobody's business. */

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {colleagueControl}
        {showDecline && incomingConnectionId && rel === "PENDING" && (
          <button type="button" className={GHOST} disabled={busy} onClick={decline}>
            Decline
          </button>
        )}
        <button type="button" className={mentor ? QUIET : GHOST} disabled={busy} onClick={toggleMentor}>
          {mentor ? "Disconnect" : "Connect as mentor"}
        </button>
      </div>
      {mentor && !busy && (
        <span className="text-[12px] font-semibold text-magenta">Mentor</span>
      )}
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </div>
  );
}
