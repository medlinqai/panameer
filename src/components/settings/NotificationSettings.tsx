"use client";

import { useState } from "react";
import { Card, postSetting } from "@/components/settings/controls";
import {
  NOTIFICATION_GROUPS,
  categoriesForAudience,
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
/* ⚠ `isDefault` — ruling 34d. True when NO preference row exists for this
   category, so the switches are showing the declared default rather than a
   choice the member made. ⚠⚠ It is resolved in `getNotificationPrefs`, not
   here: the component must never re-derive what a default is (`E585`). */
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
  /** ⚠ `P1-ALL` — audience filtering. See `categoriesForAudience`. */
  isSeller: boolean;
  isBuyer: boolean;
  /**
   * ── ⚠⚠⚠ WHETHER *THIS CATEGORY'S* EMAIL ACTUALLY SENDS (`P0-E689` WS-D) ──
   *
   * ⚠⚠ **SCOTT, 2026-09-27:** *"`emailConfigured()` is GLOBAL; the allowlist is
   * PER-EVENT. With one event on, the honest screen is neither 'email works' nor
   * 'email doesn't' — it is per-category: one sends, seventeen record intent."*
   *
   * ⚠ **SUPERSEDED, quoted not deleted (`E164`) — the single global boolean this
   * replaces, and the reason it was wrong:**
   * //   emailEnabled: boolean;
   * //   WHETHER THIS BUILD CAN SEND AN EMAIL AT ALL (P1-ALL-E382). Passed in
   * //   from the server page, which calls emailConfigured() - THE SAME FUNCTION
   * //   notify() USES. WHEN E371 LANDS THIS GOES true ON ITS OWN and the column
   * //   un-disables. No line of E382 needs deleting.
   * ⚠⚠⚠ **`E371` DID LAND, THE FLAG DID GO `true`, THE COLUMN DID UN-DISABLE —
   * AND NOTHING SENT**, because the notification layer had no sender at all.
   * **The mechanism worked exactly as designed and still produced a lie**, which
   * is why the fix is a better QUESTION rather than a better flag.
   *
   * ⚠ Computed on the SERVER, per category, and handed down — `process.env` is
   * empty in the browser, so asking here would answer `false` for everybody.
   */
  emailSendsFor: Record<string, boolean>;
  /**
   * ⚠ The GLOBAL fact, still exactly one function (`E382`), kept so the screen
   * can tell the two reasons apart: **no key at all** is a different state from
   * **a key but this category's event is not switched on**, and a member reading
   * a greyed toggle deserves the real reason.
   */
  emailConfigured: boolean;
  /** ⚠ For the summary line. Derived server-side, never counted by hand. */
  sendingCount: number;
  totalCategories: number;
}) {
  const [tab, setTab] = useState<NotificationGroup>("messages");
  const [state, setState] = useState<Record<string, Pref>>(
    Object.fromEntries(prefs.map((p) => [p.key, p]))
  );

  const group = NOTIFICATION_GROUPS.find((g) => g.id === tab)!;
  /*
    ⚠ FILTERED BY AUDIENCE (`P1-ALL`, 2026-09-01). ⚠ SUPERSEDED, quoted:
    `const rows = categoriesFor(tab);` — unfiltered, so a buyer was shown
    "Panameer can't pay you until a W-9 or W-8 is on file" and a seller was shown
    "A settlement request needs your approval". A dual-role account sees both,
    which is correct.
  */
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
                /* ⚠ THE HEADER IS LABELLED TOO (`P1-ALL-E382`), not just the
                   toggles — a greyed checkbox with a live-looking header reads
                   as a bug rather than as a state. */
                /* ⚠⚠⚠ THE HEADER NO LONGER CARRIES A VERDICT FOR THE WHOLE
                   COLUMN (`P0-E689` WS-D). It used to grey itself and print
                   "not yet" from ONE global boolean — which is exactly the
                   claim that stopped being true per row the moment a single
                   event was switched on. ⚠ The state is per category now and
                   lives on the rows; a column-wide label would contradict the
                   row under it.
                   ⚠ SUPERSEDED, quoted not deleted (`E164`):
                   //   (c === "Email" && !emailEnabled ? "text-ink-2/50" : "text-ink-2")
                   //   {c === "Email" && !emailEnabled && (<span>not yet</span>)}
                   ⚠ SMS keeps its column-wide label, and correctly: it is dark
                   for EVERY category, for one reason (`86e`). */
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
                    {/*
                      ── ⚠⚠⚠ "DEFAULT" SAYS THIS IS NOT A CHOICE YOU MADE ────

                      ⚠ SCOTT, ruling 34d: the page *"shows the EFFECTIVE value
                      and says plainly when it is the default rather than a
                      choice."* ⚠⚠ The switches beside it are already the
                      effective value; without this marker a member cannot tell
                      a setting they chose from one nobody has ever touched —
                      and those are different facts, because a default is free
                      to change and a choice is not.
                      ⚠⚠⚠ IT DISAPPEARS THE MOMENT THEY TOUCH ANYTHING in this
                      category, because saving writes the row — so the marker
                      is never stale. ⚠ It is a WORD, not a colour: a grey dot
                      would mean nothing to anyone.
                    */}
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
                    {/*
                      ⚠⚠ THE EMAIL TOGGLE IS DISABLED WHILE THE PIPE IS DOWN
                      (`P1-ALL-E382`). A member was seeing *"Messages — Email
                      ON"* for a channel that has never sent anything, which is
                      the `E034` shape with a USER-VISIBLE CONTROL: a promise the
                      build cannot keep, presented as a setting they chose.

                      ⚠ THE STORED PREFERENCE IS NOT TOUCHED. `checked` still
                      shows what they are opted into, and the category defaults
                      still say `email: true`. Flipping those to `false` would
                      silently rewrite every user's intent to fix a RENDERING
                      problem — and would lose the record of what they wanted the
                      day email starts working.

                      ⚠ `cat.locked` KEEPS ITS OWN MEANING. The two reasons a
                      toggle is disabled are different and both survive.
                    */}
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

        {/*
          ── ⚠⚠⚠ THE SCREEN SAYS WHICH STATE IT IS IN (`P0-E689` WS-D) ────────

          ⚠⚠ **A GREYED TOGGLE WITH NO REASON IS THE DEFECT, NOT THE FIX.**
          Seventeen of eighteen categories cannot send email today, and a member
          looking at seventeen greyed boxes deserves to know that their choice is
          still recorded and will apply — ⚠ which is true, because `E382` keeps
          the stored preference untouched and the defaults unflipped.

          ⚠ **RULE 3 OF THE 2026-09-23 SESSION:** *"a control says what it
          governs at the point it governs it"* — and a footnote saying *"some of
          these are exempt"* **without saying which** is worse than no note. So
          the count is named, and the per-row state is on the row itself.
        */}
        {emailConfigured && sendingCount < totalCategories && (
          <p className="mt-4 rounded-brand border border-dashed border-line px-4 py-3 text-[13px] leading-relaxed text-ink-2">
            Email is switched on one notification at a time as each is ready —{" "}
            {sendingCount} of {totalCategories} so far. For the rest, your choice
            is saved and the notification still reaches you in the app; email
            will follow without you having to come back here.
          </p>
        )}

        {/*
          ── ⚠⚠ SMS: THE REASON WAS WRONG AND IS CORRECTED (rule 6 / `86e`) ───

          ⚠⚠⚠ **"connected in test mode only" IS FALSE.** Measured 2026-09-27:
          `lib/sms.ts` is a **real Twilio sender** that POSTs to the REST API —
          it is not a stub and there is no test mode. ⚠ **All three `TWILIO_*`
          variables are simply UNSET**, so `smsConfigured()` is false and
          `sendSms()` takes its console fallback.
          ⚠⚠ **AND THE CONSEQUENCE IS WORTH SAYING OUT LOUD (ruling `90b`): the
          one `phone_verified_at` on this build was set by a code PRINTED TO A
          CONSOLE, never by a text message.** 73 persons · 61 with a phone · 1
          "verified" · **0 `PhoneVerification` rows.**
          ⚠ `86e` holds — *a channel you cannot reach is not a channel you can
          offer* — **but for the transport's reason, not the column's.**
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   SMS is recorded but not yet sending - Panameer's text provider is
          //   connected in test mode only.
        */}
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          SMS is recorded but not yet sending — text delivery isn&apos;t
          connected. Push notifications arrive with the mobile app.
        </p>
      </Card>
    </div>
  );
}
