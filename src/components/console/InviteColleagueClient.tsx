"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberRow } from "@/components/community/MemberRow";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import type { PersonCard } from "@/lib/connections";

export const DEFAULT_INVITE_NOTE = [
  "You already built this once. Get paid for it twice.",
  "",
  "Every configuration you designed, every requirement doc you wrote, every course you taught internally is still worth something. Panameer is where Oracle practitioners sell that work as a product instead of rebuilding it for a new client at an hourly rate.",
  "",
  "Free to join. You keep what you build.",
].join("\n");

export type SentInvite = {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  joined: boolean;
  sentAt: string;
  expired: boolean;
  undelivered: string | null;
};

type AlreadyMember = PersonCard & {
  relation: Relation;
  incomingConnectionId: string | null;
  isMentor: boolean;
  isSelf: boolean;
  profileId: string | null;
};

const STATUS: Record<SentInvite["status"], { label: string; tone: string }> = {
  PENDING: { label: "Invited", tone: "bg-amber-100 text-amber-800" },
  ACCEPTED: { label: "Joined", tone: "bg-emerald-100 text-emerald-800" },
  EXPIRED: { label: "Expired", tone: "bg-black/[0.06] text-ink-2" },
  REVOKED: { label: "Withdrawn", tone: "bg-black/[0.06] text-ink-2" },
};

const UNDELIVERED = { label: "Not delivered", tone: "bg-red-100 text-red-800" };

export function InviteColleagueClient({
  dayRemaining,
  dayLimit,
  sent,
}: {
  dayRemaining: number;
  dayLimit: number;
  sent: SentInvite[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(DEFAULT_INVITE_NOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ devLink?: string; email?: string } | null>(null);
  const [member, setMember] = useState<AlreadyMember | null>(null);
  const [confirming, setConfirming] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy(true);
    setError(null);
    setDone(null);
    setMember(null);
    try {
      const r = await fetch("/api/invite-colleague", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, message }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "We couldn't send that.");
        return;
      }

      if (data.alreadyMember) {
        setMember(data.alreadyMember as AlreadyMember);
        return;
      }

      setDone({ devLink: data.devLink, email: email.trim() });
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="border-t border-line py-5">
        <h2 className="font-display text-[16px] font-bold">Invite a Colleague</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          They&apos;ll get one email explaining what Panameer is and a link to
          take a look. Nothing is created for them and they don&apos;t have to
          join.
        </p>

        {error && (
          <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
            {error}
          </p>
        )}
        {}
        {member && (
          <div className="mt-3">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {member.isSelf
                ? "That's your own address."
                : `${member.name.split(" ")[0] || member.name} is already on Panameer.`}
            </p>
            <div className="mt-2">
              <MemberRow person={member as PersonCard} profileId={member.profileId}>
                {/* ⚠⚠ ONE CONTROL, AND IT PICKS ITS OWN BUTTON. `Connect as
                    colleague` / `Requested` / `Accept` / `Message` are all
                    `ConnectControls` switching on the relation the SERVER
                    computed. ⚠ No second Connect button was written here, and
                    this surface decides nothing. */}
                <ConnectControls
                  toUserId={member.userId}
                  relation={member.relation}
                  incomingConnectionId={member.incomingConnectionId}
                  isMentor={member.isMentor}
                  isSelf={member.isSelf}
                />
              </MemberRow>
            </div>
          </div>
        )}
        {done && (
          <div className="mt-3 rounded-[10px] border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-[13.5px]">
            <p className="font-semibold text-emerald-800">
              Invitation sent. It shows below until they join.
            </p>
            {/*
              THE ADDRESS IS REPEATED BACK (`P2-J3-E821`, R-E010).
              Measured read-only: the off-platform send WORKED — a SentEmail row
              for info@staterp.com, status `sent`, from production. The address
              was simply a letter short of the one intended ("staterp", not
              "straterp"), and nothing on screen said where it had gone. A
              confirmation that does not repeat the address cannot catch a typo.
            */}
            {done.email && (
              <p className="mt-1 text-emerald-900">
                Sent to <span className="font-bold">{done.email}</span> — check the address is
                right. If it is wrong, invite again with the correct one.
              </p>
            )}
            {done.devLink && (
              <p className="mt-1 break-all text-ink-2">
                No email provider configured — link:{" "}
                <a className="font-semibold text-magenta" href={done.devLink}>
                  {done.devLink}
                </a>
              </p>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold">
              Their first name{" "}
              <span className="font-semibold text-ink-2">(optional)</span>
            </span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={80}
              placeholder="Dana"
              className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold">
              Their last name{" "}
              <span className="font-semibold text-ink-2">(optional)</span>
            </span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={80}
              placeholder="Whitfield"
              className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] font-bold">Their email</span>
          <input
            type="email"
            value={email}
            /* ⚠⚠ EDITING THE ADDRESS RETRACTS THE CONFIRMATION (`E522` Part B).
               Without this, a member could confirm address A, correct it to B,
               and the second click would send B — an address NOBODY READ BACK.
               That is the exact failure the step exists to prevent, so the ask
               must be re-answered for the new address. */
            onChange={(e) => {
              setEmail(e.target.value);
              setConfirming(false);
            }}
            required
            maxLength={320}
            placeholder="dana@example.com"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] font-bold">
            Your Note{" "}
            <span className="font-semibold text-ink-2">(edit it or clear it)</span>
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="A line about why you thought of them."
            aria-label="Your note to them"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
          />
        </label>

        {/*
          ⚠⚠ THE CONFIRM STEP (`P2-J3-E522` PART B). WORDING APPROVED AS WRITTEN
          BY SCOTT, 2026-09-17, including *"`Back` rather than `Cancel` is
          right"* — nothing has happened yet, so there is nothing to cancel.

          ⚠ THE ADDRESS IS BOLD AND ON ITS OWN LINE. The entire point is to make
          the reader LOOK AT IT; a sentence with the address buried mid-line is
          the thing that already failed three times.

          ⚠⚠ "just disappears" IS A CLAIM WITH AN EXPIRY, AND SCOTT REQUIRED IT
          RECORDED AS ONE: it is true TODAY and becomes FALSE the day `E522`
          Part A ships, because the bounce webhook is precisely what stops an
          invitation to a wrong address disappearing silently. ⚠ NOTED AGAINST
          PART A — whoever builds the webhook updates this sentence.
        */}
        {confirming && (
          <div className="mt-4 rounded-brand border border-magenta/30 bg-magenta/[0.04] p-4">
            <p className="text-[15px] font-bold">Send this invitation?</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              We&rsquo;ll email{" "}
              <span className="block break-all py-1 font-bold text-ink">{email}</span>
              Check the spelling &mdash; an invitation to the wrong address just
              disappears.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || dayRemaining <= 0}
            className="bg-ink px-6 py-2.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Invitation"}
          </button>
          {/* ⚠ `Back` UNSENDS NOTHING — it returns to the form so the address can
              be corrected. It only appears once the ask is on screen. */}
          {confirming && !busy && (
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border-[1.5px] border-line px-6 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
            >
              Back
            </button>
          )}
          {/* ⚠ THE ALLOWANCE IS SHOWN ONLY WHEN IT IS NEARLY GONE. Printing
              "36 of 40 left" on a page where nobody will ever send four would
              make a limit that exists for abuse look like a quota on the user. */}
          {dayRemaining <= 5 && (
            <span className="text-[13px] text-ink-2">
              {dayRemaining === 0
                ? `You've sent ${dayLimit} invitations today — that's the daily limit.`
                : `${dayRemaining} more today.`}
            </span>
          )}
        </div>
      </form>

      <section className="border-t border-line py-5">
        <h2 className="font-display text-[16px] font-bold">Invitations Sent</h2>
        {sent.length === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            You haven&apos;t invited anyone yet. Invitations you send show up
            here, and turn to <b>Joined</b> when they take you up on it.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {sent.map((row) => {
              /* ⚠ THE COLUMN IS THE LEAST TRUSTWORTHY OF THE THREE FACTS, so
                 it is read last. `joined` is derived live; expiry is a date
                 nothing sweeps on a timer; `status` only carries what a person
                 actually set (REVOKED). */
              const key: SentInvite["status"] = row.joined
                ? "ACCEPTED"
                : row.status === "PENDING" && row.expired
                  ? "EXPIRED"
                  : row.status;
              /* ⚠ `Joined` wins: if they are on the platform, the mail reached
                 them whatever a stale receipt says. Otherwise a failure to
                 deliver is the more useful fact than "still pending". */
              const status =
                row.undelivered && !row.joined ? UNDELIVERED : STATUS[key];
              return (
                <li key={row.id} className="flex flex-wrap items-baseline gap-2 py-3.5">
                  {row.name && (
                    <span className="text-[14.5px] font-bold">{row.name}</span>
                  )}
                  <span className="text-[13px] text-ink-2">{row.email}</span>
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
