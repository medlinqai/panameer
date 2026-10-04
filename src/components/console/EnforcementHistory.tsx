"use client";

import { useState } from "react";

const TABS = [
  {
    id: "violations",
    label: "Policy Violations",
    empty: "No policy violations on record.",
    detail:
      "If Panameer ever actions your account, what happened and when will be listed here.",
  },
  {
    id: "appeals",
    label: "Submitted Appeals",
    empty: "No appeals submitted.",
    detail:
      "If you disagree with an action taken on your account, your appeal and its outcome will appear here.",
  },
] as const;

export function EnforcementHistory() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("violations");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <section className="rounded-brand border border-line bg-white">
      <div className="border-b border-line px-5 pt-4">
        <h2 className="font-display text-[16px] font-bold">Enforcement History</h2>
        <div role="tablist" className="mt-3 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setActive(t.id)}
              className={
                "-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors " +
                (active === t.id
                  ? "border-magenta text-magenta"
                  : "border-transparent text-ink-2 hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" className="px-5 py-8 text-center">
        <p className="text-[15px] font-semibold">{tab.empty}</p>
        <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-2">
          {tab.detail}
        </p>
      </div>
    </section>
  );
}
