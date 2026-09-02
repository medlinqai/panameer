"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WizardShell } from "@/components/onboarding/WizardShell";

/**
 * ⚠⚠ THE IN-APP WIZARD SHELL — NO PUBLIC CHROME (`P1-J1.1-E267`, 2026-08-30).
 *
 * This page renders INSIDE `AppShell`, which already supplies the header, the
 * rail and the footer. `E246` gave `OnboardingFrame` a `MarketingHeader` and a
 * `MarketingFooter` — correct for every PUBLIC onboarding page and wrong here,
 * so `/create-work` came out with two headers and two footers around one wizard.
 * That was chat's miss in the `E246` brief, not a CC error.
 *
 * ⚠ ONE WRAPPER, NOT A PROP ON EVERY CALL. There are nine `WizardShell`s in this
 * file and one more in `ReviewWorkRequest`; threading `chrome={false}` through
 * each by hand is a list somebody adds a tenth screen to and forgets. Setting it
 * in one place means a new step in this file CANNOT reintroduce the defect.
 * ⚠ THE DEFAULT ELSEWHERE IS STILL `true`, so no public page changed.
 */
function AppWizardShell(props: React.ComponentProps<typeof WizardShell>) {
  return <WizardShell {...props} chrome={false} />;
}

import { Notice } from "@/components/onboarding/controls";
import type { Draft, Step } from "@/components/work/CreateWorkRequest";

/**
 * REVIEW + POST (brief_create_work_request_v1 WS-D).
 *
 * Its own file because it is a different job from the seven questions before
 * it: those collect one answer each, this shows all of them at once and lets
 * you jump back into any of them. Same reason the provider wizard's review is
 * not another `case` in its switch.
 *
 * VOCABULARY: Work Request throughout. Not "job details", not "post this job".
 */
export function ReviewStep({
  identityGaps = [],
  onSaveVisibility,
  draft,
  roleName,
  domainName,
  specializationNames,
  onEdit,
  onBack,
  onPost,
  busy,
  error,
}: {
  draft: Draft | null;
  roleName: string;
  domainName: string;
  /** Resolved names for the ids on the draft — the review shows words. */
  specializationNames: string[];
  onEdit: (s: Step) => void;
  onBack: () => void;
  onPost: () => void;
  busy: boolean;
  error: string | null;
  /**
   * ⚠ THE POST GATE'S IDENTITY HALF, MIRRORED (`P1-J4-E025`). Computed on the
   * server by the same function the API refuses with; empty means nothing is
   * missing. ⚠ NOT THE BOUNDARY — see `create-work/page.tsx`.
   */
  identityGaps?: { key: string; field: string; reason: string; href: string }[];
  /** ⚠ `P1-J4-E025` — persists the COMPANY-NAME visibility on the review step. */
  onSaveVisibility?: (visibility: string, codeName: string | null) => void;
}) {
  const [confidential, setConfidential] = useState(
    draft?.companyVisibility === "CONFIDENTIAL"
  );
  const [codeName, setCodeName] = useState(draft?.companyCodeName ?? "");
  const [confirm, setConfirm] = useState(false);
  const money = (c: number | null) =>
    c === null || c === undefined
      ? null
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(c / 100);

  const budget = useMemo(() => {
    if (!draft) return null;
    const lo = money(draft.budgetMinCents);
    const hi = money(draft.budgetMaxCents);
    if (!lo && !hi) return null;
    const suffix = draft.budgetType === "HOURLY" ? " / hr" : "";
    if (lo && hi && lo !== hi) return `${lo}–${hi}${suffix}`;
    return `${lo ?? hi}${suffix}`;
  }, [draft]);

  const dates =
    draft?.startDate || draft?.endDate
      ? [draft?.startDate, draft?.endDate].filter(Boolean).join(" → ")
      : null;

  return (
    <AppWizardShell
      title="Looking Good — Here's Your Work Request"
      subtitle="Check it over. You can change anything before you post."
      canBack
      onBack={onBack}
      busy={busy}
      wide
      onContinue={() => setConfirm(true)}
      continueLabel="Post Work Request"
      continueDisabled={
        !draft ||
        draft.skillIds.length === 0 ||
        identityGaps.length > 0 ||
        (confidential && !codeName.trim())
      }
    >
      {error && <Notice>{error}</Notice>}

      {/*
        ── ⚠⚠ WHO IS ASKING — THE POST GATE, STATED BEFORE THE BUTTON ─────────

        SCOTT: *"i am letting you post for free… if you refuse to give basic
        details… meh, maybe it isn't the place for you?"*

        ⚠ EACH ROW NAMES THE FIELD, GIVES ONE REASON IN THE PROVIDER'S INTEREST,
        AND LINKS TO WHERE IT IS FIXED. Not "complete your profile" — that tells
        a requester nothing and is the exact refusal this replaces. The strings
        come from `POST_REQUIREMENTS`, the same table the server refuses with.

        ⚠ IT IS NOT STYLED AS AN ERROR. Nothing has gone wrong; they have not
        finished. Red here would read as a fault.
      */}
      {identityGaps.length > 0 && (
        <div className="mb-5 rounded-brand border border-line bg-bg-soft p-5">
          <p className="text-[15px] font-bold">
            Before you post, providers need to know who is asking
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            Posting is free. Posting anonymously is not something providers will
            answer — they see who is asking before they spend an afternoon on a
            proposal.
          </p>
          <ul className="mt-3 grid gap-2.5">
            {identityGaps.map((g) => (
              <li key={g.key} className="text-[14px] leading-relaxed">
                <Link
                  href={g.href}
                  className="font-bold text-magenta hover:underline"
                >
                  {g.field}
                </Link>{" "}
                <span className="text-ink-2">— {g.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewCard title="Role & Domain" onEdit={() => onEdit("role")}>
          {roleName || "—"}
          {domainName ? ` · ${domainName}` : ""}
        </ReviewCard>
        <ReviewCard title="Skills" onEdit={() => onEdit("skills")}>
          {draft?.skillNames.length
            ? draft.skillNames.map((s) => s.name).join(", ")
            : "None yet"}
        </ReviewCard>
        <ReviewCard title="Specializations" onEdit={() => onEdit("specializations")}>
          {specializationNames.length > 0 ? specializationNames.join(", ") : "None"}
        </ReviewCard>
        <ReviewCard title="Dates" onEdit={() => onEdit("dates")}>
          {dates ?? "Not set"}
        </ReviewCard>
        <ReviewCard title="Location" onEdit={() => onEdit("location")}>
          {draft?.locationCountry ?? "Not set"}
        </ReviewCard>
        <ReviewCard title="Budget" onEdit={() => onEdit("budget")}>
          {budget ?? "Not set"}
        </ReviewCard>
        <ReviewCard title="Description" onEdit={() => onEdit("description")}>
          {draft?.description ? `${draft.description.slice(0, 160)}…` : "Not set"}
        </ReviewCard>
      </div>

      {/*
        ── ⚠⚠ CONFIDENTIAL HIRING (`P1-J4-E025`) ───────────────────────────────

        ⚠ IT HIDES THE COMPANY NAME AND THE LOGO. NOTHING ELSE — and the copy
        says so out loud, because a buyer who believes this hides THEM will use
        it expecting anonymity and a provider will read the result as a scam.
        The person, the country, the industry, the standing counts and both
        verification lines stay visible: *"a verified company in Oil & Gas,
        hiring confidentially"* is still answerable.

        ⚠ A CODE NAME IS REQUIRED, exactly as `employers.ts:301` requires one for
        a CONFIDENTIAL project. The server refuses without it; this asks for it
        first rather than letting the save fail.
      */}
      <div className="mt-5 rounded-brand border border-line p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={confidential}
            onChange={(e) => {
              const on = e.target.checked;
              setConfidential(on);
              if (!on) onSaveVisibility?.("PUBLIC", null);
              else if (codeName.trim()) onSaveVisibility?.("CONFIDENTIAL", codeName.trim());
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-magenta"
          />
          <span>
            <span className="block text-[14.5px] font-bold">
              Hire confidentially
            </span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
              Providers see a code name instead of your company name and logo.
              They still see you, your country, your industry, how many requests
              you have posted, and what Panameer has verified.
            </span>
          </span>
        </label>
        {confidential && (
          <div className="mt-3 pl-7">
            <label
              htmlFor="wr-code-name"
              className="block text-[13px] font-semibold"
            >
              Code name providers will see
            </label>
            <input
              id="wr-code-name"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              onBlur={() =>
                codeName.trim() && onSaveVisibility?.("CONFIDENTIAL", codeName.trim())
              }
              placeholder="A global energy company"
              className="mt-1.5 w-full max-w-sm rounded-[10px] border border-line px-3 py-2 text-[14px]"
            />
            {!codeName.trim() && (
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                Required — a blank space where a company name should be reads as
                missing data, not as a decision.
              </p>
            )}
          </div>
        )}
      </div>

      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post this Work Request"
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-brand border border-line bg-white p-6">
            <h2 className="font-display text-[20px] font-bold">
              What happens after you post your Work Request?
            </h2>
            {/*
              PANAMEER'S VOICE, and only claims that are true. No "job", no
              third-party assistant persona, and nothing about proposal volume
              or timing — nobody has posted one yet, so any number here would be
              invented.
            */}
            <ul className="mt-3 grid gap-2 text-[14.5px] leading-relaxed text-ink-2">
              <li>· Providers can find it and send you proposals.</li>
              <li>· You can invite providers to it directly.</li>
              <li>· Nothing is charged until you hire someone.</li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={busy}
                className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onPost}
                disabled={busy}
                className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
              >
                {busy ? "Posting…" : "Post Work Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppWizardShell>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-line bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-[13px] font-bold text-magenta hover:text-magenta-dark"
        >
          ✏️ Edit
        </button>
      </div>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{children}</p>
    </section>
  );
}
