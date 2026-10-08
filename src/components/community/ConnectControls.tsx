"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Relation = "PENDING" | "ACCEPTED" | "DECLINED" | "FOLLOWING" | null;

type Props = {
  toUserId: string;
  /** The colleague relation as the server computed it. */
  relation: Relation;
  incomingConnectionId?: string | null;
  /** Whether I have already connected to them as a mentor. */
  isMentor?: boolean;
  /** Mentoring needs approval (2026-10-08): REQUESTED while they decide, MENTOR once accepted. */
  mentorStatus?: "REQUESTED" | "MENTOR" | null;
  isSelf?: boolean;
  showDecline?: boolean;
  tone?: "magenta" | "outline" | "block";
  part?: "all" | "colleague" | "mentor";
};

const BTN =
  "px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-default";
const PRIMARY = `${BTN} bg-ink text-surface hover:bg-ink-hover disabled:bg-ink-2/15 disabled:text-ink-2`;
const GHOST = `${BTN} border border-ink bg-surface text-ink hover:bg-surface-hover`;
const QUIET = `${BTN} text-ink-2`;
// The opt-in face: white, 1px ink border, ink text — the same family as `pm-btn` on the
const OUTLINE = `${BTN} border border-ink text-ink hover:bg-black/[0.04] disabled:border-line disabled:text-ink-2`;
// Full-width box, same as the profile rail's Message button (Scott 2026-10-08).
const BLOCK = "pm-btn transition-colors hover:bg-surface-hover disabled:cursor-default disabled:border-line disabled:bg-line disabled:text-ink-3";

export function ConnectControls({
  toUserId,
  relation,
  incomingConnectionId = null,
  isMentor = false,
  mentorStatus,
  isSelf = false,
  showDecline = false,
  tone = "magenta",
  part = "all",
}: Props) {
  // Resolved once, so every primary affordance in this component moves together — a second
  const block = tone === "block";
  const PRIMARY_TONE = block ? BLOCK : tone === "outline" ? OUTLINE : PRIMARY;
  const router = useRouter();
  const [rel, setRel] = useState<Relation>(relation);
  const [mentor, setMentor] = useState<"REQUESTED" | "MENTOR" | null>(mentorStatus !== undefined ? mentorStatus : isMentor ? "MENTOR" : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* A control you cannot press is noise, so your own row renders nothing. */
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
      // THE SERVER'S STATUS WINS OVER THE OPTIMISTIC GUESS. `requestColleague`
      if (body.action === "mentor") setMentor(data?.status === "MENTOR" ? "MENTOR" : "REQUESTED");
      else if (typeof data?.status !== "undefined" && !body.action.startsWith("mentor") && body.action !== "unmentor") {
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
    // SINGLE CLICK, NO CONFIRM — and that was checked against the consequence
    return send(
      { action: "decline", connectionId: incomingConnectionId! },
      () => setRel("DECLINED"),
      () => setRel(before)
    );
  };
  const toggleMentor = () => {
    const before = mentor;
    const action = mentor === "MENTOR" ? "unmentor" : mentor === "REQUESTED" ? "mentor_withdraw" : "mentor";
    return send(
      { action, toUserId },
      () => setMentor(action === "mentor" ? "REQUESTED" : null),
      () => setMentor(before)
    );
  };

  /* ── the colleague half: one button, chosen by `relation` ─────────────── */
  let colleagueControl: React.ReactNode = null;
  if (rel === null) {
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled={busy} onClick={connectColleague}>
        Connect with Me
      </button>
    );
  } else if (rel === "PENDING" && incomingConnectionId) {
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled={busy} onClick={accept}>
        Accept
      </button>
    );
  } else if (rel === "PENDING") {
    /* DISABLED, NOT HIDDEN — you asked, and you should be able to see that. */
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled>
        Requested
      </button>
    );
  } else if (rel === "ACCEPTED" && block) {
    // Message has its own box above on the profile rail.
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled>
        Connected
      </button>
    );
  } else if (rel === "ACCEPTED") {
    // — AN ACCEPTED COLLEAGUE GETS `Message`, NOT A DISABLED
    colleagueControl = (
      <Link href={`/messages?with=${toUserId}`} className={PRIMARY_TONE}>
        Message
      </Link>
    );
  }
  // the row so the same request cannot be re-sent forever. Rendering an error

  /* WHICH HALVES THIS INSTANCE DRAWS (`E720` item 10). `all` keeps today's single row. */
  const showColleague = part === "all" || part === "colleague";
  const showMentor = part === "all" || part === "mentor";

  return (
    <div className={block ? "flex w-full flex-col gap-1" : "flex flex-col items-start gap-1"}>
      <div className={block ? "flex w-full flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
        {showColleague && colleagueControl}
        {showColleague && showDecline && incomingConnectionId && rel === "PENDING" && (
          <button type="button" className={GHOST} disabled={busy} onClick={decline}>
            Decline
          </button>
        )}
        {/* answering what a connected colleague's card should offer */}
        {/* WHITE WITH AN INK BORDER ON THE PROFILE RAIL ( item 10) — Scott's words for */}
        {showMentor && mentor === null && (
          <button type="button" data-mentor-state="none" className={block ? BLOCK : tone === "outline" ? OUTLINE : GHOST} disabled={busy} onClick={toggleMentor}>
            Mentor Me
          </button>
        )}
        {showMentor && mentor === "REQUESTED" && (
          <span className={block ? "flex w-full flex-col gap-1" : "inline-flex items-center gap-2"}>
            <button type="button" data-mentor-state="requested" className={block ? BLOCK : tone === "outline" ? OUTLINE : GHOST} disabled>
              Requested
            </button>
            <button type="button" className="text-[12.5px] font-semibold text-ink-2 underline underline-offset-2" disabled={busy} onClick={toggleMentor}>
              Withdraw
            </button>
          </span>
        )}
        {showMentor && mentor === "MENTOR" && (
          <span className={block ? "flex w-full flex-col gap-1" : "inline-flex items-center gap-2"}>
            <button type="button" data-mentor-state="mentor" className={block ? BLOCK : tone === "outline" ? OUTLINE : GHOST} disabled>
              Your Mentor ✓
            </button>
            <button type="button" className={QUIET} disabled={busy} onClick={toggleMentor}>
              Disconnect
            </button>
          </span>
        )}
      </div>
      {/* PART E — THIS IS A STATUS, NOT A CONTROL. It was */}
      {/* THE STATE, SHOWN ONCE FOLLOWED ( item 10 — Scott's *"It shows state once */}

      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </div>
  );
}
