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
    <section>
      <h2 className="mb-1.5 mt-[38px] text-[22px] font-bold">Enforcement History</h2>
      <div role="tablist" className="mt-2.5 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={
              "-mb-px border-b-2 py-2.5 text-[14px] font-medium transition-colors " +
              (active === t.id ? "border-magenta text-magenta" : "border-transparent text-ink-2 hover:text-ink")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="py-[26px] text-[14px] text-ink-2">
        <b className="mb-1 block text-ink">{tab.empty}</b>
        {tab.detail}
      </div>
    </section>
  );
}
