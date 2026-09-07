"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/casing/Button";
import { Avatar } from "@/components/Avatar";

/**
 * INVITE NAMED PROVIDERS TO BID ON A LINE (`P1-J4-E392` WS-3).
 *
 * ── ⚠⚠ THE FENCE ────────────────────────────────────────────────────────────
 *
 * **THIS CREATES THE INVITE AND NOTHING MORE.** No bid list, no comparison, no
 * scoring, no shortlist, no tests, no interviews. `E395` built the models those
 * screens will read; the screens are their own brief. ⚠ NOTHING HERE RENDERS A
 * `ProviderBid`, and `check:hire` asserts that absence — *"just show whether
 * they replied"* is one `include` away and is the beginning of the bid screen.
 *
 * ⚠ THE STUB THIS REPLACES WAS RIGHT TO BE A STUB. It said *"THERE IS NO
 * WORK-INVITATION MODEL… wiring this button to `CoordinatorInvite` would be
 * fabrication by mislabelling."* `BidRequest` landed on 2026-09-07 (`E395`), so
 * the invitation now has somewhere honest to write.
 */

type ProviderOption = {
  personId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  name: string;
  headline: string;
  photoUrl: string | null;
  validated: boolean;
  relevantSkills: number;
  matchedSkillNames: string[];
};

type LineOption = { id: string; lineNumber: number; description: string; invitedCount: number };

export function InviteToBid({
  workRequestId,
  lines,
  providers,
  initialLineId,
  alreadyInvitedPersonIds,
}: {
  workRequestId: string;
  lines: LineOption[];
  providers: ProviderOption[];
  initialLineId: string | null;
  alreadyInvitedPersonIds: string[];
}) {
  const [lineId, setLineId] = useState(initialLineId ?? lines[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [respondsBy, setRespondsBy] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ created: number; already: number } | null>(null);

  const invited = new Set(alreadyInvitedPersonIds);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  /*
    ⚠ THE CLOSING DATE IS REQUIRED HERE BECAUSE IT IS REQUIRED THERE. `E395`'s
    `assertIssuable` refuses an ITB with no `responds_by` — *"a bid with no
    closing date never closes, and a requester cannot shortlist against an
    open-ended set."* This mirrors that rule so the requester learns it at the
    field rather than at the button; the API is still the boundary.
  */
  const ready = !!lineId && picked.length > 0 && respondsBy !== "" && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/work-requests/${workRequestId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId,
          providerPersonIds: picked,
          respondsBy,
          message,
        }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(out.error ?? "Could not send those invitations.");
        return;
      }
      setSent({ created: out.created?.length ?? 0, already: out.alreadyInvited?.length ?? 0 });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-brand border-2 border-magenta/40 bg-magenta/[0.04] p-6">
        <p className="text-[16px] font-bold">
          {sent.created} invitation{sent.created === 1 ? "" : "s"} sent.
        </p>
        {/*
          ⚠ "ALREADY INVITED" IS REPORTED, NOT TREATED AS A FAILURE. A buyer who
          invites five and then selects all six must get the sixth invitation and
          a note about the five, never a wall of errors and no sixth.
        */}
        {sent.already > 0 && (
          <p className="mt-1.5 text-[14px] text-ink-2">
            {sent.already} of those{" "}
            {sent.already === 1 ? "was" : "were"} already invited — one invitation
            per provider per request, so nothing was duplicated.
          </p>
        )}
        <Button href={`/work-requests/${workRequestId}`} className="mt-5">
          Back to the request
        </Button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-5 rounded-[10px] border border-amber-400/60 bg-amber-50 p-3 text-[14px]">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-brand border border-line bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-[13.5px] font-semibold">Which line? *</label>
          {/*
            ⚠ THE INVITE NAMES A LINE, and that is `E395`'s shape:
            `BidRequestLine.work_request_line_id`. Not every ITB covers every
            line — a request for a DBA and a developer goes out as two different
            invitations naming two different lines.
          */}
          <select
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                Line {l.lineNumber} — {l.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13.5px] font-semibold">Bids close on *</label>
          <input
            type="date"
            value={respondsBy}
            onChange={(e) => setRespondsBy(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
          <p className="mt-1 text-[13px] text-ink-2">
            Required — a bid with no closing date never closes.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[13.5px] font-semibold">
            A note for them <span className="font-normal text-ink-2">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="We're looking to start in October and can be flexible on hours."
            className="mt-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
        </div>
      </div>

      <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
        Who should bid?{" "}
        <span className="font-normal text-ink-2">({picked.length} selected)</span>
      </h2>
      <p className="mt-1 text-[14px] text-ink-2">
        These providers claim the skills this request asked for.
      </p>

      {providers.length === 0 ? (
        <div className="mt-5 rounded-brand border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[16px] font-bold">Nobody matches these skills yet</p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            Your request can still be found by providers as they publish their
            profiles — inviting is a shortcut, not the only route in.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {providers.map((p) => {
            const already = invited.has(p.personId);
            const on = picked.includes(p.personId);
            return (
              <li key={p.personId}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => toggle(p.personId)}
                  className={`w-full rounded-brand border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    on ? "border-magenta bg-magenta/[0.04]" : "border-line bg-white hover:border-magenta/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      firstName={p.firstName}
                      lastName={p.lastName}
                      photoUrl={p.photoUrl}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{p.name}</p>
                      {p.validated && (
                        <span className="text-[12.5px] font-semibold text-emerald-700">
                          ✓ Validated
                        </span>
                      )}
                    </div>
                    {already ? (
                      <span className="shrink-0 text-[12.5px] font-bold text-ink-2">
                        Invited
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 text-[12.5px] font-bold ${
                          on ? "text-magenta" : "text-ink-2"
                        }`}
                      >
                        {on ? "Selected" : "Select"}
                      </span>
                    )}
                  </div>
                  {p.headline && (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
                      {p.headline}
                    </p>
                  )}
                  <p className="mt-2 text-[13px] font-semibold text-magenta">
                    {p.relevantSkills} relevant skill{p.relevantSkills === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {p.matchedSkillNames.slice(0, 4).join(", ")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button disabled={!ready} onClick={submit}>
          {busy
            ? "Sending…"
            : `Invite ${picked.length || ""} provider${picked.length === 1 ? "" : "s"}`.trim()}
        </Button>
        <Link
          href={`/work-requests/${workRequestId}`}
          className="text-[14.5px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
        >
          Back to the request
        </Link>
      </div>
      {/* ⚠ THE BUTTON SAYS WHY IT IS OFF — the same rule the detail page follows. */}
      {!ready && !busy && (
        <p className="mt-3 text-[13.5px] text-ink-2">
          {picked.length === 0
            ? "Select at least one provider."
            : respondsBy === ""
              ? "Set the date bids close on."
              : "Choose a line."}
        </p>
      )}
    </div>
  );
}
