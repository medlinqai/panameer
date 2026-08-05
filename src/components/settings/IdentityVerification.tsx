"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Select, postSetting } from "@/components/settings/controls";

/**
 * Identity Verification (J2.4 WS-H / E019).
 *
 * FREE, and NOT the merit badge (Confirm #3). Both corrections are on the page
 * rather than only in the code: the surface this replaces charged 35 Connects
 * for it, and it sat close enough to the "Validated" badge that the two read as
 * the same thing. They are not — identity is something anyone with a passport
 * can establish; validation is Panameer vouching for the quality of somebody's
 * work, on merit, and is never for sale.
 *
 * NO DOCUMENT IS UPLOADED HERE. The person says which document they'll present;
 * capture, the selfie and the storage belong to the KYC partner the brief
 * defers. Taking an image now would mean holding government ID with no lawful
 * basis and no deletion schedule.
 */
type Status = "NOT_STARTED" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "EXPIRED";

const DOCS = ["Passport", "Driving licence", "National ID card"];

const STATE: Record<Status, { label: string; tone: string; blurb: string }> = {
  NOT_STARTED: {
    label: "Not started",
    tone: "bg-black/[0.06] text-ink-2",
    blurb: "Verify your identity to earn the ID badge on your profile.",
  },
  SUBMITTED: {
    label: "Under review",
    tone: "bg-amber-100 text-amber-800",
    blurb: "We have your submission. Reviews are manual while we finish onboarding a verification partner.",
  },
  VERIFIED: {
    label: "Verified",
    tone: "bg-emerald-100 text-emerald-800",
    blurb: "Your ID badge is live on your profile. It's good for three years.",
  },
  REJECTED: {
    label: "Needs another look",
    tone: "bg-red-100 text-red-800",
    blurb: "Something didn't check out. You can submit again.",
  },
  EXPIRED: {
    label: "Expired",
    tone: "bg-black/[0.06] text-ink-2",
    blurb: "ID badges last three years. Verify again to restore yours.",
  },
};

export function IdentityVerificationPanel({
  status,
  document,
  submittedAt,
  expiresAt,
  note,
  validated,
}: {
  status: Status;
  document: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  validated: boolean;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState(DOCS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = STATE[status];
  const canSubmit = status !== "SUBMITTED" && status !== "VERIFIED";

  return (
    <div className="space-y-4">
      <Card title="ID Badge">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide ${state.tone}`}
          >
            {state.label}
          </span>
          <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-emerald-700">
            Free
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {state.blurb}
        </p>
        {(submittedAt || expiresAt) && (
          <p className="mt-2 text-[13px] text-ink-2">
            {submittedAt && <>Submitted {submittedAt}. </>}
            {expiresAt && <>Valid until {expiresAt}.</>}
            {document && <> Document: {document}.</>}
          </p>
        )}
        {note && (
          <p className="mt-2 rounded-[10px] bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
            {note}
          </p>
        )}
      </Card>

      {canSubmit && (
        <Card
          title="Verify Your Identity"
          description="Three steps: a government ID, a short selfie video, then a review. Nothing is uploaded from this page yet — tell us which document you'll present and we'll take it from there."
        >
          <div className="max-w-sm">
            <Select
              label="Document you'll present"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
            >
              {DOCS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const err = await postSetting("/api/settings/identity", {
                  document: doc,
                });
                setError(err);
                setBusy(false);
                if (!err) router.refresh();
              }}
              className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Start Verification"}
            </button>
            {error && <span className="text-[13.5px] text-red-700">{error}</span>}
          </div>
          <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-ink-2">
            Document capture is handled by a specialist verification partner
            we&apos;re onboarding. Until it&apos;s connected, Panameer stores only
            which document you intend to use — no images, no ID numbers.
          </p>
        </Card>
      )}

      {/*
        THE DISTINCTION, said plainly and on the page — not left to a naming
        convention nobody outside the team knows.
      */}
      <Card
        title="This Is Not The Validated Badge"
        tone="dashed"
      >
        <p className="max-w-2xl text-[14px] leading-relaxed text-ink-2">
          The ID badge says you are who you say you are. <b>Validated</b> is
          different: Panameer grants it on the merit of your work, after
          reviewing it, and it can never be bought.{" "}
          {validated ? (
            <>You currently hold it.</>
          ) : (
            <>
              You don&apos;t hold it yet — it&apos;s requested from{" "}
              <Link href="/profile" className="font-semibold text-magenta hover:underline">
                your profile
              </Link>{" "}
              once your work history is complete.
            </>
          )}
        </p>
      </Card>
    </div>
  );
}
