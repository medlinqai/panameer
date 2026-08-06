"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { Popover } from "@/components/casing/Popover";
import { useMe } from "@/components/MeProvider";
import { membershipBadge } from "@/lib/membership";
import {
  ADMIN_PERSONA_NAV,
  PERSONA_NAV_PRIMARY,
  PERSONA_NAV_SECONDARY,
} from "@/lib/nav";
import {
  applyThemeChoice,
  subscribeThemeChoice,
  themeChoiceServerSnapshot,
  themeChoiceSnapshot,
  type ThemeChoice,
} from "@/lib/theme";

/**
 * THE PERSONA MENU (J2.4 WS-B / E008, E021).
 *
 * Extracted out of AppHeader, which had grown a two-item dropdown inline. It is
 * six destinations, a submenu, an availability toggle and a role-dependent
 * shape now — enough logic that leaving it inside the header would have made
 * the header a component about menus rather than about the header.
 *
 * THE SECTION BARS ARE GONE (WS1-C). J2.4 grouped the list under "You" and
 * "Preferences" bars; the deck interleaves Theme INTO the list — My Profile ·
 * My Stats · Account Health Checklist · Theme › · Request Recommendations · My
 * Company · Settings — so a bar would have had to sit mid-sentence. The
 * identity header still separates who-you-are from what-you-can-do, which was
 * the distinction the bars were carrying.
 *
 * E212/E214 — A FLOATING POPOVER, ANCHORED BOTTOM-LEFT. It used to be an
 * absolutely-positioned panel inside the rail, which put it inside the rail's
 * scrolling column: it could be clipped exactly like the submenu flyouts were,
 * and it pushed against the rail's own edge. It is a portalled popover now, the
 * same primitive the flyouts use, opening UPWARDS from the identity block at
 * the bottom of the rail — the third of the three zones (org top-left, work in
 * the middle, you at the bottom).
 *
 * THE ADMIN SEES A SHORTER MENU. My Stats, Account Health and Request
 * Recommendations are all marketplace-provider surfaces: a Panameer employee
 * has no job success score, no account standing as a seller, and nobody to ask
 * for a recommendation. They are omitted rather than shown empty, because an
 * empty page you can never fill is worse than an absent one.
 */

export function AccountMenu({
  isAdmin,
  variant = "header",
}: {
  isAdmin: boolean;
  /**
   * WHERE THE TRIGGER LIVES (WS1-A).
   *
   * `header` is the original round avatar in the top-right cluster. `rail` is
   * the deck's identity block: avatar + name + membership badge + a chevron,
   * sitting in the dark rail under the utility row. Same menu, same code —
   * only the button that opens it and which way the panel drops differ, so the
   * two positions cannot drift into two different account menus.
   */
  variant?: "header" | "rail";
}) {
  const { me, refresh } = useMe();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /*
    The theme choice is read from localStorage through `useSyncExternalStore`
    rather than copied into state on mount. The boot script has already applied
    it to <html>; this only catches the menu's checkmark up with what the page
    is already showing, and the server snapshot ("auto") is what the markup was
    built against, so hydration stays clean.
  */
  const theme = useSyncExternalStore(
    subscribeThemeChoice,
    themeChoiceSnapshot,
    themeChoiceServerSnapshot
  );

  /*
    OPTIMISM AS AN OVERRIDE, not as a copy of the server value. Holding
    availability in state and syncing it from `me` in an effect meant two
    sources of truth and a render where they disagreed; this derives from `me`
    and only diverges while a write is in flight.
  */
  const [pending, setPending] = useState<boolean | null>(null);
  const serverAvailable = me?.providerProfile?.availableForMessages ?? null;
  const available = pending ?? serverAvailable;

  const close = useCallback(() => {
    setOpen(false);
    // The submenu collapses with the menu. Leaving it expanded means the next
    // open shows Theme mid-interaction, which reads as a stuck control.
    setThemeOpen(false);
  }, []);

  const first = me?.person.firstName ?? "";
  const last = me?.person.lastName ?? "";
  const badge = isAdmin ? "Panameer Admin" : membershipBadge(me);
  /*
    THE DECK'S ORDER (WS1-C): My Profile · My Stats · Account Health Checklist ·
    Theme › · Request Recommendations · My Company · Settings · Sign Out. The
    two halves come from nav.ts already split around the theme row, so this
    component never has to match on a label to know where the submenu goes.

    THE ADMIN KEEPS THE SHORT LIST. `ADMIN_PERSONA_NAV` is My Profile only —
    stats, account health and recommendations are seller surfaces. Settings goes
    too: /settings requires canProvideServices, so offering it to an employee is
    offering them a redirect to /dashboard?noaccess=1.
  */
  const primary = isAdmin ? ADMIN_PERSONA_NAV : PERSONA_NAV_PRIMARY;
  const secondary = isAdmin ? [] : PERSONA_NAV_SECONDARY;

  /*
    OPTIMISTIC, WITH A REVERT. The toggle is a two-state switch on a fast write;
    waiting for the round trip makes it feel broken, and a failed write that
    silently leaves the UI switched would tell the provider they are reachable
    when the marketplace still thinks they are not.
  */
  const toggleAvailable = async () => {
    if (available === null) return;
    const next = !available;
    setPending(next);
    try {
      const r = await fetch("/api/provider/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      if (!r.ok) throw new Error("rejected");
      // Re-read /api/me, then drop the override — the server value is now the
      // one the whole shell agrees on.
      refresh();
    } finally {
      setPending(null);
    }
  };

  const rowClass =
    "block w-full px-4 py-2.5 text-left text-[14.5px] hover:bg-black/[0.04]";

  return (
    <>
      {variant === "rail" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
          <Avatar
            firstName={first}
            lastName={last}
            photoUrl={me?.person.photoUrl}
            size={34}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-bold text-white">
              {`${first} ${last}`.trim() || "Signed in"}
            </span>
            {badge && (
              <span className="block truncate text-[12.5px] text-white/55">
                {badge}
              </span>
            )}
          </span>
          <span aria-hidden className="pl-1 text-white/45">
            ›
          </span>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-black/[0.04]"
        >
          <Avatar
            firstName={first}
            lastName={last}
            photoUrl={me?.person.photoUrl}
            size={32}
          />
        </button>
      )}

      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        /*
          From the rail the block sits at the BOTTOM, so the panel opens upward;
          from the header it drops beneath the avatar and right-aligns. The
          popover flips either of those when the viewport is short.
        */
        placement={variant === "rail" ? "top-start" : "bottom-end"}
        width={304}
        label="Account menu"
      >
        <div className="-my-1.5">
          {/* ---- Section 1: who you are ---------------------------------- */}
          <div className="border-b border-line px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Avatar
                firstName={first}
                lastName={last}
                photoUrl={me?.person.photoUrl}
                size={40}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">
                  {`${first} ${last}`.trim() || "Signed in"}
                </p>
                {badge && (
                  <p className="mt-0.5 inline-block rounded-full bg-magenta/10 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-magenta">
                    {badge}
                  </p>
                )}
              </div>
            </div>

            {/*
              The availability toggle sits WITH the identity, not in the list
              below it: it is a fact about the person, and it is the one control
              here whose state you want to read without opening anything.
              Providers only — an admin is not reachable as a seller.
            */}
            {available !== null && (
              <button
                type="button"
                role="switch"
                aria-checked={available}
                onClick={toggleAvailable}
                className="mt-3 flex w-full items-center gap-2.5 rounded-[10px] border border-line px-3 py-2 text-left transition-colors hover:border-magenta/40"
              >
                <span
                  aria-hidden
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (available ? "bg-emerald-500" : "bg-ink-2/40")
                  }
                />
                <span className="flex-1 text-[13.5px] font-semibold">
                  Online for messages
                </span>
                <span
                  aria-hidden
                  className={
                    "relative h-[18px] w-8 shrink-0 rounded-full transition-colors " +
                    (available ? "bg-magenta" : "bg-line")
                  }
                >
                  <span
                    className={
                      "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all " +
                      (available ? "left-[16px]" : "left-[2px]")
                    }
                  />
                </span>
              </button>
            )}
          </div>

          {/* ---- Your surfaces, then Theme, then the rest ---------------- */}
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={close}
              className={rowClass}
            >
              {item.label}
            </Link>
          ))}

          {/*
            THEME IS A SUBMENU, NOT A PAGE (E021). Three mutually exclusive
            values with an instant effect is a radio group; sending someone to a
            settings page to flip it would cost two navigations to change
            something they can see change behind the menu.
          */}
          <button
            type="button"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((v) => !v)}
            className={`${rowClass} flex items-center justify-between`}
          >
            {/*
              THE LABEL CARRIES THE VALUE — "Theme: Light ›", per the deck. A
              row reading just "Theme" makes you open the submenu to find out
              what you are already on, which is the one question the row is
              there to answer at a glance.
            */}
            <span>
              Theme: {THEME_OPTIONS.find((t) => t.value === theme)?.label}
            </span>
            <span
              aria-hidden
              className={"text-ink-2 " + (themeOpen ? "inline-block rotate-90" : "")}
            >
              ›
            </span>
          </button>
          {themeOpen && (
            <div role="radiogroup" aria-label="Theme" className="bg-black/[0.02] py-1">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.value}
                  onClick={() => applyThemeChoice(option.value)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 pl-7 text-left text-[14px] hover:bg-black/[0.04]"
                >
                  <span
                    aria-hidden
                    className={
                      "w-3 text-[13px] font-black " +
                      (theme === option.value ? "text-magenta" : "text-transparent")
                    }
                  >
                    ✓
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {option.hint && (
                    <span className="text-[12.5px] text-ink-2">{option.hint}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={close}
              className={rowClass}
            >
              {item.label}
            </Link>
          ))}

          {/* ---- Sign out ----------------------------------------------- */}
          <div className="border-t border-line">
            <button
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`${rowClass} font-semibold text-red-600`}
            >
              Sign Out
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}

const THEME_OPTIONS: { value: ThemeChoice; label: string; hint?: string }[] = [
  { value: "auto", label: "Auto", hint: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
