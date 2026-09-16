"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * INVITE A COLLEAGUE — composer + the record of who has been asked (`P2-J3-E493`).
 *
 * ⚠ THE SHAPE IS `RecommendationsClient`'s ON PURPOSE — same card rhythm, same
 * `router.refresh()` after a send rather than local list state, so the server
 * component above stays the only thing that owns the query and the list cannot
 * disagree with the database.
 *
 * ⚠⚠ THE COPY IS NOT `RecommendationsClient`'s. That page asks somebody to
 * VOUCH FOR YOU; this one asks somebody to JOIN. Reusing the recommendation
 * sentences with words swapped would make both asks vaguer.
 *
 * ⚠ THE NAME FIELDS ARE OPTIONAL AND THE MESSAGE IS EMPTY BY DEFAULT. There is
 * no template here — `/recommendations` pre-fills one because a favour from a
 * blank page does not get written, whereas "look at this" is a sentence people
 * already know how to say, and a templated invitation reads like bulk mail.
 */
export type SentInvite = {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  /** ⚠ DERIVED BY THE SERVER from whether an account exists for that address —
      see the page. Nothing writes `status: ACCEPTED`, so a stored-only read
      would still say "Invited" the day after they joined. */
  joined: boolean;
  sentAt: string;
  expired: boolean;
};

const STATUS: Record<SentInvite["status"], { label: string; tone: string }> = {
  PENDING: { label: "Invited", tone: "bg-amber-100 text-amber-800" },
  ACCEPTED: { label: "Joined", tone: "bg-emerald-100 text-emerald-800" },
  EXPIRED: { label: "Expired", tone: "bg-black/[0.06] text-ink-2" },
  REVOKED: { label: "Withdrawn", tone: "bg-black/[0.06] text-ink-2" },
};

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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ devLink?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fetch("/api/invite-colleague", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, message }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* ⚠ THE SERVER'S OWN SENTENCE IS SHOWN. "Already a member", "already
           invited" and "slow down" are three different answers and collapsing
           them into "couldn't send" would leave someone retrying forever. */
        setError(data.error ?? "We couldn't send that.");
        return;
      }
      setDone({ devLink: data.devLink });
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
      <form onSubmit={submit} className="rounded-brand border border-line bg-white p-5">
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
        {done && (
          <div className="mt-3 rounded-[10px] border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-[13.5px]">
            <p className="font-semibold text-emerald-800">
              Invitation sent. It shows below until they join.
            </p>
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
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={320}
            placeholder="dana@example.com"
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px] outline-none focus:border-magenta"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] font-bold">
            Add a note <span className="font-semibold text-ink-2">(optional)</span>
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="A line about why you thought of them."
            className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || dayRemaining <= 0}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Invitation"}
          </button>
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

      <section className="rounded-brand border border-line bg-white p-5">
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
              const status = STATUS[key];
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
