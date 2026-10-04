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
  isSelf?: boolean;
  showDecline?: boolean;
  tone?: "magenta" | "outline";
  part?: "all" | "colleague" | "mentor";
};

const BTN =
  "px-3.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-default";
const PRIMARY = `${BTN} bg-ink text-surface hover:bg-ink-hover disabled:bg-ink-2/15 disabled:text-ink-2`;
const GHOST = `${BTN} border border-ink bg-surface text-ink hover:bg-surface-hover`;
const QUIET = `${BTN} text-ink-2`;
/* ⚠ The opt-in face: white, 1px ink border, ink text — the same family as `pm-btn` on the
   profile rail, so `Hire`, `Message` and this read as one set rather than three treatments. */
const OUTLINE = `${BTN} border border-ink text-ink hover:bg-black/[0.04] disabled:border-line disabled:text-ink-2`;

export function ConnectControls({
  toUserId,
  relation,
  incomingConnectionId = null,
  isMentor = false,
  isSelf = false,
  showDecline = false,
  tone = "magenta",
  part = "all",
}: Props) {
  /* ⚠ Resolved once, so every primary affordance in this component moves together — a second
     `tone === …` at a call site below is how one of the four buttons would get left behind. */
  const PRIMARY_TONE = tone === "outline" ? OUTLINE : PRIMARY;
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
      <button type="button" className={PRIMARY_TONE} disabled={busy} onClick={connectColleague}>
        Connect as Colleague
      </button>
    );
  } else if (rel === "PENDING" && incomingConnectionId) {
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled={busy} onClick={accept}>
        Accept
      </button>
    );
  } else if (rel === "PENDING") {
    /* ⚠ DISABLED, NOT HIDDEN — you asked, and you should be able to see that. */
    colleagueControl = (
      <button type="button" className={PRIMARY_TONE} disabled>
        Requested
      </button>
    );
  } else if (rel === "ACCEPTED") {
    /*
      ⚠⚠ `P2-J3-E525` — AN ACCEPTED COLLEAGUE GETS `Message`, NOT A DISABLED
      BADGE. SCOTT, 2026-09-15: *"CONNECT if the user/card exists and you are not
      connected...MESAGE if you are."*

      ⚠ THIS REPLACED A `disabled` BUTTON READING `Colleague` — a control that
      stated a fact and could not be pressed, in the one state where there is
      something worth doing. ⚠⚠ THE STATE IS STILL LEGIBLE: `Message` is only
      ever offered to a colleague, because `canMessage` is COLLEAGUE-ONLY.

      ⚠ `?with=` IS THE PAGE'S OWN DEEP LINK (`P1-ALL-E379`), not a new route —
      `/messages` reads it from `searchParams` and opens that conversation. ⚠⚠ IT
      IS A LINK, NOT A FETCH, so it stays outside `send()` and cannot disturb the
      optimistic-then-revert path.
    */
    colleagueControl = (
      <Link href={`/messages?with=${toUserId}`} className={PRIMARY_TONE}>
        Message
      </Link>
    );
  }
  /* ⚠ `DECLINED` FALLS THROUGH TO NOTHING, AND THAT IS THE DESIGN. `E372` keeps
     the row so the same request cannot be re-sent forever. Rendering an error
     would tell the sender they were declined, which is nobody's business. */

  /* ⚠ WHICH HALVES THIS INSTANCE DRAWS (`E720` item 10). ⚠⚠ `all` keeps today's single row. */
  const showColleague = part === "all" || part === "colleague";
  const showMentor = part === "all" || part === "mentor";

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {showColleague && colleagueControl}
        {showColleague && showDecline && incomingConnectionId && rel === "PENDING" && (
          <button type="button" className={GHOST} disabled={busy} onClick={decline}>
            Decline
          </button>
        )}
        {/*
          ⚠⚠⚠ `Request to Mentor`, NOT `Connect as Mentor` — SCOTT, 2026-09-25,
          answering what a connected colleague's card should offer:
          *"Connected colleagues should show Message & Request to Mentor."*
          ⚠ It is the more honest verb as well as his word: a `MENTOR` row is
          created ACCEPTED unilaterally (the connection model's one-way
          exception), so "Connect" understated what the button does and
          "Request" says the member is ASKING.
          ⚠ Rule 11 — Title Case on a button label.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   {mentor ? "Disconnect" : "Connect as Mentor"}
        */}
        {/*
          ⚠⚠ WHITE WITH AN INK BORDER ON THE PROFILE RAIL (`E720` item 10) — Scott's words for
          this control. ⚠⚠⚠ **IT RESOLVES OFF `tone`, NOT OFF `part`, AND IT IS NOT
          `PRIMARY_TONE`:** using `PRIMARY_TONE` would have made this button SOLID MAGENTA on
          the ten magenta-tone consumers, repainting every community card from inside an item
          about one rail. ⚠ So `outline` callers get `OUTLINE` and everybody else keeps `GHOST`,
          byte for byte.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <button type="button" className={mentor ? QUIET : GHOST} …>
        */}
        {showMentor && (
          <button
            type="button"
            className={mentor ? QUIET : tone === "outline" ? OUTLINE : GHOST}
            disabled={busy}
            onClick={toggleMentor}
          >
            {mentor ? "Disconnect" : "Request to Mentor"}
          </button>
        )}
      </div>
      {/*
        ⚠⚠ `P1-A3-E531` PART E — THIS IS A STATUS, NOT A CONTROL. It was
        `text-magenta` on the page background, which `E433` reserves for
        SATURATED INTERACTIVE things; a label you cannot click wearing the
        colour of the button beside it reads as a second button.
        ⚠ PROPOSED TREATMENT, SCOTT NAMES AND RULES ON WEIGHT: a pale magenta
        wash with ink-2 text — the same "surface, not control" move `E433` made
        elsewhere. It stays a chip so it still reads as a badge.
        ⚠⚠ IT IS NOT REMOVED. It is the only thing on the card that says the
        mentor relation exists.
      */}
      {/* ⚠ THE STATE, SHOWN ONCE FOLLOWED (`E720` item 10 — Scott's *"It shows state once
          followed"*). ⚠⚠ It rides with the mentor half, so a colleague-only instance does not
          print a mentor badge it has no control for. */}
      {showMentor && mentor && !busy && (
        <span className="rounded-full bg-magenta/[0.08] px-2 py-0.5 text-[12px] font-semibold text-ink-2">
          Mentor
        </span>
      )}
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </div>
  );
}
