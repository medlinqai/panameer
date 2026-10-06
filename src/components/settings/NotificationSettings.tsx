"use client";

import { useState } from "react";
import { Card, postSetting } from "@/components/settings/controls";
import {
  NOTIFICATION_GROUPS,
  categoriesForAudience,
  type NotificationGroup,
} from "@/lib/notification-categories";

type Pref = {
  key: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  isDefault: boolean;
};

export function NotificationSettings({
  prefs,
  isSeller,
  isBuyer,
  emailSendsFor,
  emailConfigured,
  sendingCount,
  totalCategories,
}: {
  prefs: Pref[];
  isSeller: boolean;
  isBuyer: boolean;
  emailSendsFor: Record<string, boolean>;
  emailConfigured: boolean;
  sendingCount: number;
  totalCategories: number;
}) {
  const [tab, setTab] = useState<NotificationGroup>("messages");
  const [state, setState] = useState<Record<string, Pref>>(
    Object.fromEntries(prefs.map((p) => [p.key, p]))
  );

  const group = NOTIFICATION_GROUPS.find((g) => g.id === tab)!;
  const rows = categoriesForAudience(tab, { isSeller, isBuyer });

  const setChannel = async (
    key: string,
    channel: "inApp" | "email" | "sms",
    next: boolean
  ) => {
    const before = state[key];
    setState((s) => ({ ...s, [key]: { ...s[key], [channel]: next } }));
    const err = await postSetting("/api/settings/notifications", {
      category: key,
      [channel]: next,
    });
    if (err) setState((s) => ({ ...s, [key]: before }));
  };

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {NOTIFICATION_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={tab === g.id}
            onClick={() => setTab(g.id)}
            className={
              "-mb-px border-b-2 px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors " +
              (tab === g.id
                ? "border-magenta text-magenta"
                : "border-transparent text-ink-2 hover:text-ink")
            }
          >
            {g.label}
          </button>
        ))}
      </div>

      <Card title={group.label} description={group.blurb}>
        <div className="hidden grid-cols-[1fr_repeat(3,64px)] gap-2 border-b border-line pb-2 sm:grid">
          <span />
          {(["In-App", "Email", "SMS"] as const).map((c) => (
            <span
              key={c}
              className={
                "text-center text-[11.5px] font-bold uppercase tracking-wide " +
                (c === "SMS" ? "text-ink-2/50" : "text-ink-2")
              }
            >
              {c}
              {c === "SMS" && (
                <span className="block text-[10px] font-semibold normal-case tracking-normal">
                  not yet
                </span>
              )}
            </span>
          ))}
        </div>

        <ul>
          {rows.map((cat) => {
            const pref = state[cat.key];
            if (!pref) return null;
            return (
              <li
                key={cat.key}
                className="grid grid-cols-1 gap-2 border-b border-line py-3 last:border-0 sm:grid-cols-[1fr_repeat(3,64px)] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold">
                    {cat.label}
                    {}
                    {pref.isDefault && (
                      <span className="ml-2 rounded-full bg-line-2 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-[0.05em] text-ink-3">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                    {cat.blurb}
                  </p>
                </div>
                {(["inApp", "email", "sms"] as const).map((channel) => (
                  <div key={channel} className="flex items-center gap-2 sm:justify-center">
                    <span className="text-[12.5px] font-semibold text-ink-2 sm:hidden">
                      {channel === "inApp" ? "In-App" : channel === "email" ? "Email" : "SMS"}
                    </span>
                    {}
                    <input
                      type="checkbox"
                      aria-label={
                        `${cat.label} — ${channel}` +
                        (channel === "email" && !emailSendsFor[cat.key]
                          ? emailConfigured
                            ? " (these are recorded in the app; email for this notification is not switched on yet)"
                            : " (email delivery is not switched on yet)"
                          : "")
                      }
                      checked={pref[channel]}
                      disabled={cat.locked || (channel === "email" && !emailSendsFor[cat.key])}
                      onChange={(e) => setChannel(cat.key, channel, e.target.checked)}
                      className="h-4 w-4 accent-magenta disabled:opacity-40"
                    />
                  </div>
                ))}
              </li>
            );
          })}
        </ul>

        {/* THE SCREEN SAYS WHICH STATE IT IS IN WS-D) */}
        {emailConfigured && sendingCount < totalCategories && (
          <p className="mt-4 rounded-brand border border-dashed border-line px-4 py-3 text-[13px] leading-relaxed text-ink-2">
            Email is switched on one notification at a time as each is ready —{" "}
            {sendingCount} of {totalCategories} so far. For the rest, your choice
            is saved and the notification still reaches you in the app; email
            will follow without you having to come back here.
          </p>
        )}

        {/* SMS: THE REASON WAS WRONG AND IS CORRECTED (rule 6 / `86e`) */}
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          SMS is recorded but not yet sending — text delivery isn&apos;t
          connected. Push notifications arrive with the mobile app.
        </p>
      </Card>
    </div>
  );
}
