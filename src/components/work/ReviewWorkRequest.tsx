"use client";

import { useMemo, useState } from "react";
import { WizardShell } from "@/components/onboarding/WizardShell";
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
  draft,
  roleName,
  domainName,
  onEdit,
  onBack,
  onPost,
  busy,
  error,
}: {
  draft: Draft | null;
  roleName: string;
  domainName: string;
  onEdit: (s: Step) => void;
  onBack: () => void;
  onPost: () => void;
  busy: boolean;
  error: string | null;
}) {
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
    <WizardShell
      title="Looking good — here's your Work Request"
      subtitle="Check it over. You can change anything before you post."
      canBack
      onBack={onBack}
      busy={busy}
      wide
      onContinue={() => setConfirm(true)}
      continueLabel="Post Work Request"
      continueDisabled={!draft || draft.skillIds.length === 0}
    >
      {error && <Notice>{error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewCard title="Role & domain" onEdit={() => onEdit("role")}>
          {roleName || "—"}
          {domainName ? ` · ${domainName}` : ""}
        </ReviewCard>
        <ReviewCard title="Skills" onEdit={() => onEdit("skills")}>
          {draft?.skillNames.length
            ? draft.skillNames.map((s) => s.name).join(", ")
            : "None yet"}
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
    </WizardShell>
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
