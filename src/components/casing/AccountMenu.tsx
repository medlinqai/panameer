"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOutEverywhere } from "@/lib/sign-out";
import { PathMenuBlock } from "@/components/casing/PathMenuBlock";
import { Avatar } from "@/components/Avatar";
import { Popover } from "@/components/casing/Popover";
import { BAND_LIT, BAND_TILE } from "@/components/casing/band-lit";
import { useMe } from "@/components/MeProvider";
import { membershipBadge } from "@/lib/membership";
import {
  ADMIN_PERSONA_NAV,
  COMPANY_PERSONA_ITEM,
  PERSONA_NAV,
} from "@/lib/nav";
import {
  applyThemeChoice,
  subscribeThemeChoice,
  themeChoiceServerSnapshot,
  themeChoiceSnapshot,
  type ThemeChoice,
} from "@/lib/theme";

export function AccountMenu({
  isAdmin,
  variant = "header",
  onDark = false,
  active = false,
}: {
  isAdmin: boolean;
  active?: boolean;
  onDark?: boolean;
  variant?: "header" | "rail";
}) {
  const { me, refresh } = useMe();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const theme = useSyncExternalStore(
    subscribeThemeChoice,
    themeChoiceSnapshot,
    themeChoiceServerSnapshot
  );

  const [pending, setPending] = useState<boolean | null>(null);
  const serverAvailable = me?.providerProfile?.availableForMessages ?? null;
  const available = pending ?? serverAvailable;

  const [summary, setSummary] = useState<MenuSummary | null>(null);
  const fetched = useRef(false);
  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;
    let live = true;
    fetch("/api/me/menu-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j) setSummary(j as MenuSummary);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);

  const close = useCallback(() => {
    if (panelRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
    setOpen(false);
    // The submenus collapse with the menu. Leaving one expanded means the next
    // open shows it mid-interaction, which reads as a stuck control.
    setThemeOpen(false);
  }, []);

  const first = me?.person?.firstName ?? "";
  const last = me?.person?.lastName ?? "";
  const badge = isAdmin ? "Panameer Admin" : membershipBadge(me);
  /* The company the rail chip used to name. See the My Company block below. */
  const company = me?.company;
  const rows = isAdmin ? ADMIN_PERSONA_NAV : PERSONA_NAV;

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

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const items = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []
      );
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? items.length - 1
            : e.key === "ArrowDown"
              ? at < 0
                ? 0
                : (at + 1) % items.length
              : at < 0
                ? items.length - 1
                : (at - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const valueFor = (href: string): { text: string; ok?: boolean } | null => {
    if (href === "/score" && summary?.scorePercent != null) {
      return { text: `${summary.scorePercent}%` };
    }
    if (href === "/account-health" && summary?.account) {
      return { text: summary.account.label, ok: summary.account.ok };
    }
    return null;
  };

  // THE `Theme` SUBMENU, LIFTED TO A LOCAL ELEMENT ( WS-A) so the
  const themeBlock = (
    <>
          {/* THEME IS A SUBMENU, NOT A PAGE (E021). Three mutually exclusive */}
          <button
            type="button"
            aria-expanded={themeOpen}
            data-menu-item
            onClick={() => setThemeOpen((v) => !v)}
            className={`${rowClass} flex items-center justify-between`}
          >
            {/* THE LABEL CARRIES THE VALUE — "Theme: Light ›", per the deck. A */}
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
                  data-menu-item
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
    </>
  );

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
          className="flex w-full items-center gap-2.5 px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
          <Avatar
            firstName={first}
            lastName={last}
            photoUrl={me?.person?.photoUrl}
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
          // THE FILL WAS ALREADY RIGHT. THE GEOMETRY HID IT
          aria-current={active ? "page" : undefined}
          className={
            // A SQUARE TILE, NOT A DISC item 1)
            `flex items-center gap-1.5 ${BAND_TILE} p-[7px] transition-colors ` +
            (active
              ? BAND_LIT
              : onDark
                ? "hover:bg-white/10"
                : "hover:bg-black/[0.04]")
          }
        >
          <Avatar
            firstName={first}
            lastName={last}
            photoUrl={me?.person?.photoUrl}
            size={32}
          />
        </button>
      )}

      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        // From the rail the block sits at the BOTTOM, so the panel opens upward
        placement={variant === "rail" ? "top-start" : "bottom-end"}
        width={304}
        label="Account menu"
      >
        <div ref={panelRef} className="-my-1.5">
          {/* ---- Section 1: who you are ---------------------------------- */}
          <div className="border-b border-line px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Avatar
                firstName={first}
                lastName={last}
                photoUrl={me?.person?.photoUrl}
                size={40}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">
                  {`${first} ${last}`.trim() || "Signed in"}
                </p>
                {/* THE TITLE, NEW IN WS-A (option B) */}
                {me?.person?.title && (
                  <p className="truncate text-[12.5px] text-ink-2">
                    {me.person.title}
                  </p>
                )}
                {badge && (
                  <p className="mt-0.5 inline-block rounded-full bg-magenta/10 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-magenta">
                    {badge}
                  </p>
                )}
              </div>
            </div>

            {/* Option B puts it beside your photo because the profile is the */}

            {/* The availability toggle sits WITH the identity, not in the list */}
            {available !== null && (
              <button
                type="button"
                role="switch"
                data-menu-item
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

          <PathMenuBlock onNavigate={close} rowClass={rowClass} />
          {/* R1: switch the other side on — buy and sell are per work order, not account types. */}
          {me?.person?.roles && !me.person.roles.isServiceProvider && (
            <MenuRow href="/join/provider" label="Start Selling" value={null} onClick={close} className={rowClass} />
          )}
          {me?.person?.roles && !me.person.roles.isRequester && !me.person.roles.isServiceBuyer && (
            <MenuRow href="/join/requester" label="Start Buying" value={null} onClick={close} className={rowClass} />
          )}
          {/* MY COMPANY (E099, and it REVERSES E225) */}

          {/* ONE LIST, IN 89f's ORDER WS-A) */}
          {(company?.isMember && !isAdmin ? [rows[0], COMPANY_PERSONA_ITEM, ...rows.slice(1)] : rows).map((item) => (
            <Fragment key={item.href}>
              <MenuRow
                href={item.href}
                label={item.label}
                value={valueFor(item.href)}
                onClick={close}
                className={rowClass}
              />
            </Fragment>
          ))}
          {!isAdmin && themeBlock}
          {/* WS-A sheds the band's bug icon at phone width. IT DOES NOT */}

          {/* ---- Sign out ----------------------------------------------- */}
          <div className="border-t border-line">
            <button
              role="menuitem"
              data-menu-item
              data-sign-out
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOutEverywhere();
              }}
              className={`${rowClass} font-semibold text-red-600 disabled:opacity-70`}
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}

/** THE SHAPE `/api/me/menu-summary` RETURNS. Both fields are NULLABLE and */
type MenuSummary = {
  scorePercent: number | null;
  account: { ok: boolean; label: string } | null;
};

/** One navigating row, with an optional value on the right. */
function MenuRow({
  href,
  label,
  value,
  onClick,
  className,
}: {
  href: string;
  label: string;
  value: { text: string; ok?: boolean } | null;
  onClick: () => void;
  className: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      data-menu-item
      onClick={onClick}
      className={`${className} flex items-center justify-between gap-3`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {value && (
        <span
          className={
            "shrink-0 text-[13px] font-bold tabular-nums " +
            // — A FIGURE IS INK. MAGENTA MEANS INTERACTIVE
            (value.ok === undefined
              ? "text-ink"
              : value.ok
                ? "text-emerald-600"
                : "text-ink-2")
          }
        >
          {value.text}
        </span>
      )}
    </Link>
  );
}

const THEME_OPTIONS: { value: ThemeChoice; label: string; hint?: string }[] = [
  { value: "auto", label: "Auto", hint: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
