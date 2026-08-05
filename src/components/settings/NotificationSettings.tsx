"use client";

import { useState } from "react";
import { Card, postSetting } from "@/components/settings/controls";
import {
  NOTIFICATION_GROUPS,
  categoriesFor,
  type NotificationGroup,
} from "@/lib/notification-categories";

/**
 * Notification Settings (J2.4 WS-H / E020).
 *
 * THREE TABS, AND A CHANNEL PER NOTIFICATION. The tabs are the brief's —
 * Messages, Email updates, Tax settings — and the grid inside each is the part
 * the surface being replaced didn't have: In-App, Email, SMS chosen per
 * category rather than one master switch per group. People want the milestone
 * deadline by SMS and the product news not at all, and a per-group switch
 * cannot express that.
 *
 * SMS SAYS WHAT IT IS. Twilio is stubbed, so the toggle records a preference
 * that nothing will act on yet, and the page states that rather than letting
 * someone rely on a text that never arrives. Push is deferred with the app.
 *
 * ONE LOCKED ROW. "A tax form is required before payout" can't be switched off:
 * it is the notification that unblocks getting paid, and an off switch on it is
 * a way to silently strand your own money.
 */
type Pref = { key: string; inApp: boolean; email: boolean; sms: boolean };

export function NotificationSettings({ prefs }: { prefs: Pref[] }) {
  const [tab, setTab] = useState<NotificationGroup>("messages");
  const [state, setState] = useState<Record<string, Pref>>(
    Object.fromEntries(prefs.map((p) => [p.key, p]))
  );

  const group = NOTIFICATION_GROUPS.find((g) => g.id === tab)!;
  const rows = categoriesFor(tab);

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
              className="text-center text-[11.5px] font-bold uppercase tracking-wide text-ink-2"
            >
              {c}
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
                  <p className="text-[14.5px] font-semibold">{cat.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                    {cat.blurb}
                  </p>
                </div>
                {(["inApp", "email", "sms"] as const).map((channel) => (
                  <div key={channel} className="flex items-center gap-2 sm:justify-center">
                    <span className="text-[12.5px] font-semibold text-ink-2 sm:hidden">
                      {channel === "inApp" ? "In-App" : channel === "email" ? "Email" : "SMS"}
                    </span>
                    <input
                      type="checkbox"
                      aria-label={`${cat.label} — ${channel}`}
                      checked={pref[channel]}
                      disabled={cat.locked}
                      onChange={(e) => setChannel(cat.key, channel, e.target.checked)}
                      className="h-4 w-4 accent-magenta disabled:opacity-40"
                    />
                  </div>
                ))}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          SMS is recorded but not yet sending — Panameer&apos;s text provider is
          connected in test mode only. Push notifications arrive with the mobile
          app.
        </p>
      </Card>
    </div>
  );
}
