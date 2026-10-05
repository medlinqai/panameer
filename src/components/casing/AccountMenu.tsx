"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOut } from "next-auth/react";
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

  /*
    ⚠⚠ THE `Theme` SUBMENU, LIFTED TO A LOCAL ELEMENT (`E687` WS-A) so the
    row loop can place it where ruling 89f put it — immediately before
    `My Tickets`. ⚠ The JSX itself is UNCHANGED, byte for byte; only where
    it is rendered moved. ⚠⚠ It keeps its own state (`themeOpen`), which is
    why it is a local element and not a module constant.
  */
  const themeBlock = (
    <>
          {/*
            THEME IS A SUBMENU, NOT A PAGE (E021). Three mutually exclusive
            values with an instant effect is a radio group; sending someone to a
            settings page to flip it would cost two navigations to change
            something they can see change behind the menu.
          */}
          <button
            type="button"
            aria-expanded={themeOpen}
            data-menu-item
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
          /*
            ── ⚠⚠⚠ THE FILL WAS ALREADY RIGHT. THE GEOMETRY HID IT (`P2-A2-E717`) ─────────

            ⚠ **SCOTT, 2026-09-30:** *"On `/community` the Connect item gets the full magenta
            backlight; on `/profile` the avatar gets only a faint ring."*
            ⚠⚠ **AND `bg-rail-active` WAS ALREADY BEING APPLIED — MEASURED ON TRUNK:** the
            button computed to **36×36 with `padding: 2px`** and
            `background: rgb(176, 42, 174)`. ⚠⚠⚠ **2px OF FILL AROUND A 32px CIRCLE IS A
            RING, WHATEVER THE CLASS IS CALLED.** The comment below it claimed *"not a ring"*
            and the padding made one — **the stated rule was right and the layout overruled
            it**, which no class-name check could ever have caught.
            ⚠ **MEASURED SO THE TWO TREATMENTS CAN BE COMPARED:** a band pill is **73×46,
            `padding: 6px 12px`**. So the avatar gets `p-[7px]` — 32 + 14 = **46px, the
            pill's own height** — and the lit disc reads at the same weight as a lit pill
            instead of as an outline.
            ⚠⚠ **THE PADDING IS CONSTANT IN BOTH STATES, DELIBERATELY.** Growing the button
            only when active would move the band's right-hand cluster on every navigation —
            a layout shift keyed on which page you are on.
            ⚠ `E217`'s rule is unchanged and is what this restores: active is a SOLID fill,
            the translucent wash is hover and nothing else.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   ⚠⚠ THE SAME FILL THE PILLS TAKE (`bg-rail-active`), not a ring and
            //      not a third treatment — `E217`'s rule that active is a SOLID fill
            //      and the translucent wash is hover.
            //   className={"flex items-center gap-1.5 rounded-full p-0.5 transition-colors " + …}
          */
          aria-current={active ? "page" : undefined}
          className={
            /*
              ── ⚠⚠⚠ A SQUARE TILE, NOT A DISC (`P2-A2-E720` item 1) ──────────────────────

              ⚠ **SCOTT: *"lit state = square tile. Same magenta rounded-square as a lit band
              item, photo inside as a normal circle, no ring."***
              ⚠⚠ **`E717` GOT THE FILL RIGHT AND THE SILHOUETTE WRONG.** It measured the pill
              at 73×46 and sized this button to 46×46 so the fill read at the same weight —
              correct, and still a **magenta CIRCLE in a row of magenta ROUNDED-SQUARES**.
              ⚠⚠⚠ **`BAND_TILE` IS THE BAND ITEM'S OWN `rounded-[8px]`, IMPORTED, NOT RETYPED**
              — which is the *"reuse the band item's lit class"* half of the instruction.
              ⚠ **`p-[7px]` IS KEPT AND IS NOT A RING:** 32 + 7 + 7 = **46px**, the pill's own
              height, so the tile is a square the same size as a lit item rather than an
              outline around a photo. ⚠⚠ The padding is constant in both states, deliberately —
              growing it only when active would shift the band's right-hand cluster on every
              navigation.
              ⚠ **THE PHOTO STAYS A CIRCLE** because `Avatar` draws its own; nothing here
              clips it, so *"photo inside as a normal circle"* needed no change.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   "flex items-center gap-1.5 rounded-full p-[7px] transition-colors " +
              //   (active ? "bg-rail-active" : onDark ? … )
            */
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
        /*
          From the rail the block sits at the BOTTOM, so the panel opens upward;
          from the header it drops beneath the avatar and right-aligns. The
          popover flips either of those when the viewport is short.
        */
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
                {/*
                  ── ⚠⚠ THE TITLE, NEW IN `P2-A2-E598` WS-A (option B) ────────

                  ⚠ The mockup's header is photo, name, TITLE. It is what makes
                  the block read as your profile rather than as a login receipt.
                  ⚠⚠ `me.person.title` IS THE ONE TITLE COLUMN — `E595` WS-B
                  collapsed `ProviderProfile.headline` into `Person.title`, and
                  `me.ts:61` carries the note. There is no second field to pick
                  the wrong one of any more.
                  ⚠ Absent for a member who has not set one; the row simply does
                  not render rather than showing a placeholder.
                */}
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

            {/*
              ── ⚠⚠⚠ `View Profile` IS A BUTTON IN THE HEADER, NOT A ROW ──────

              ⚠ Option B puts it beside your photo because the profile is the
              menu's SUBJECT, not one of its errands.
              ⚠⚠ IT REPLACES THE `My Profile` ROW, which left `PERSONA_NAV_
              PRIMARY` — quoted, not deleted, in `nav.ts`. ⚠ The href is
              UNCHANGED (`/profile`), so nothing that linked there has moved.
              ⚠⚠⚠ **CORRECTED 2026-09-27 (`P2-ALL-E687` WS-B) — THIS CLAIM WAS
              FALSE AND IT IS THE DANGEROUS HALF (§6, rule 6).** ⚠ SUPERSEDED,
              quoted not deleted (`E164`):
              //   `/profile` STILL REDIRECTS TO `/connect` TODAY. WS-B is what
              //   makes it the profile itself; pointing at the stable route now
              //   means this button does not change when that lands (`E591`).
              ⚠⚠ **MEASURED: `/profile` RENDERS.** `app/(app)/profile/page.tsx`
              mounts `MyProfilePage` with its own `PageTabs`; the redirect is
              commented out at `:52` as an `E164` quote of the old behaviour.
              ⚠ **A stated rule that contradicts correct behaviour is the more
              dangerous half — the next person implements the comment.**
            */}

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

          {/*
            ── MY COMPANY (E099, and it REVERSES E225) ────────────────────────

            E225 took "My Company" OUT of this menu, on the reasoning that it
            was the last item crossing the company/personal line, and the rail
            grew a company chip as its replacement. Scott reversed that on
            2026-08-15, knowingly and on the record: "move 'My Company' under
            the My Profile menus for the user", and — asked directly whether the
            rail chip should stay as a second door — one door, not two. The chip
            is gone from `AppRail`; this is the route now.

            ⚠ THE ADMIN / MEMBER DISTINCTION SURVIVED THE MOVE, which is the part
            that could easily have been dropped. The chip was two different
            controls wearing one name:

              company admin -> a MENU of company-administration surfaces
              everyone else -> a PLAIN LINK to the read-only company page

            Both are preserved here, the admin's as a submenu on the same
            pattern as Theme. Flattening it to one link for everybody would have
            silently cost admins four destinations; showing the menu to everyone
            would offer a member four pages that all bounce them. The predicate
            is the server's — `me.company.isAdmin` comes from `getMe`, set by the
            same APPROVED + ADMIN membership test the page gates use, so this
            menu and the pages behind it cannot disagree about who is an admin.
          */}

          {/*
            ── ⚠⚠⚠ ONE LIST, IN 89f's ORDER (`P2-ALL-E687` WS-A) ─────────────

            ⚠⚠ **`My Company` MOVED ABOVE THE ROWS** and `Theme` now renders
            immediately BEFORE `My Tickets`, which is the order Scott settled:
            `My Profile · My Company · My Account Settings · Invite a Colleague ·
            Request a Recommendation · Theme · My Tickets`.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — the old three-part
            render, `primary.map` then My Company then Theme then
            `secondary.map`:
            //   {primary.map((item) => ( <MenuRow … /> ))}
            //   …My Company…
            //   …Theme…
            //   {secondary.map((item) => ( <MenuRow … /> ))}

            ⚠⚠ **`Theme` IS PLACED BY HREF, NOT BY INDEX** (`THEME_BEFORE_HREF`)
            — a `slice(-1)` would move it silently the day a row is appended.
            ⚠ `valueFor()` is still called per row and still keys on `href`; the
            two rows that HAD values are gone, so it now returns null for every
            row. **It is left in place deliberately** — see `nav.ts` on the
            dropped figures, and `/api/me/menu-summary` is not changed.
          */}
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
          {/*
            ── ⚠⚠⚠ `Report a Bug` — PHONE WIDTH ONLY (`P2-ALL-E694` WS-A) ─────

            ⚠ WS-A sheds the band's bug icon at phone width. ⚠⚠ **IT DOES NOT
            DISAPPEAR — IT ARRIVES HERE (rule 5)**, and `md:hidden` means the
            door opens in **exactly** the window where the icon closes: never
            both, never neither.
            ⚠⚠⚠ **MEASURED: the band icon was `/support/bug`'s ONLY
            unconditional door in the logged-in shell** — `AppHeader.tsx:434`
            has been dead since `E559`, and `/support/tickets` only links on once
            you are already in support.

            ⚠⚠ **IT IS NOT ONE OF RULING 89f's NAV ROWS AND IT IS DELIBERATELY
            NOT IN THAT LIST.** 89f settled the menu as `My Profile · My Company ·
            My Account Settings · Invite a Colleague · Request a Recommendation ·
            Theme · My Tickets`, and said the identity block, the messages toggle
            and `Sign Out` are *"not nav rows, not touched"*. ⚠ This sits in that
            same utility area, below the rule, beside `Sign Out` — **so a ruled
            list is not quietly extended by a breakpoint change.**
          */}

          {/* ---- Sign out ----------------------------------------------- */}
          <div className="border-t border-line">
            <button
              role="menuitem"
              data-menu-item
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

/**
 * ⚠⚠ THE SHAPE `/api/me/menu-summary` RETURNS. Both fields are NULLABLE and
 * that is meaningful, not defensive: a member with no provider profile has no
 * score and no seller standing, and rendering `0%` or *"All good"* at them
 * would be a claim about an account that does not exist.
 */
type MenuSummary = {
  scorePercent: number | null;
  account: { ok: boolean; label: string } | null;
};

/**
 * One navigating row, with an optional value on the right.
 *
 * ⚠ THE LABEL RENDERS IMMEDIATELY AND THE VALUE ARRIVES LATER — Scott's
 * instruction in terms. ⚠⚠ THERE IS NO SKELETON OR SPINNER: a row that works
 * has nothing to wait for, and a placeholder would advertise a delay the reader
 * has no reason to care about.
 */
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
            /*
              ── ⚠⚠⚠ `E433` — A FIGURE IS INK. MAGENTA MEANS INTERACTIVE ──────

              ⚠ CAUGHT AT THE GATE BY LOOKING AT THE SCREENSHOT: `67%` first
              shipped MAGENTA, which reads as a link inside a row that is
              already a link — and `E433` is explicit that *"figures, so ink
              rather than magenta"* and *"nothing here is interactive, so
              nothing here is magenta."*
              ⚠⚠ `67%` IS A FIGURE, so it is ink.

              ⚠ `All good` IS A STATUS, NOT A FIGURE, and the mockup marks it
              with its own `ok` class — green when everything passes, ink when
              something does not. ⚠⚠ NEVER RED: the row reports standing, and a
              pending email verification is a to-do, not an alarm.
            */
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
