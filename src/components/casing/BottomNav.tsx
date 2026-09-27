"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RailIcon } from "@/components/casing/RailIcon";
import { bandPrefixesFor, type NavItem } from "@/lib/nav";
import "./bottom-nav.css";

/**
 * ── ⚠⚠⚠ M1 AT PHONE WIDTH — THE BOTTOM BAR (`P2-ALL-E694` WS-B) ────────────
 *
 * Ruling 88. ⚠ **Icon AND label. Icon-only is banned (88a): there is no hover on
 * touch, so an unlabelled icon is a guess.**
 *
 * ⚠⚠⚠ **THE BAND WAS ALREADY ICON-ONLY BELOW 780px AND THAT IS THE DEFECT, NOT
 * THE PRECEDENT.** `app-band.css` hides `.pm-band-label` there *"because the
 * label is what costs the width"* — ⚠ it bought the width by removing the thing
 * that says what the icon is, **and the row still hid 122px afterwards.** Paying
 * with the label did not even work.
 *
 * ── ⚠⚠ IT READS ITS ITEMS. IT DOES NOT DEFINE THEM ────────────────────────
 *
 * ⚠⚠⚠ **NOT ONE LABEL, ICON OR COUNT IS WRITTEN IN THIS FILE.** `items` arrives
 * from `navForRoles(me)` in `lib/nav.ts`, already capability-filtered. ⚠ **The
 * test of this workstream is that changing which five appear is a `lib/nav.ts`
 * edit and nothing else** — so this component must stay ignorant of what a
 * Panameer journey is called.
 *
 * ── ⚠⚠ THE MAX-5 CEILING IS ENFORCED, NOT ASSUMED ────────────────────────
 *
 * ⚠ Measured 2026-09-27 after `E688`/`E692`/`E693`: **every role is five or
 * fewer and there is no sixth item on either rail**, so nothing is truncated
 * today. ⚠⚠ **THE CEILING STAYS IN THE CODE ANYWAY.** A sixth added later must
 * hit a **named failure** rather than silently falling off the end — that is
 * `check:mobile-rows`' mutation proof, and it is why `MAX` is a constant here
 * and not a comment.
 * ⚠⚠⚠ **NOTHING IS DROPPED SILENTLY: the overflow is rendered, not discarded**
 * (rule 5 — a sixth item that is merely absent is a removed capability).
 */

/** ⚠ Ruling 88's number, in one place, so a gate can mutate it. */
export const BOTTOM_NAV_MAX = 5;

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  /* ⚠ THE SAME ACTIVE RULE THE BAND USES, from the same function — a second
     rule here would drift and light a different pill than the band does at the
     breakpoint boundary (`E585`). */
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : bandPrefixesFor(href).some((p) => pathname.startsWith(p));

  const shown = items.slice(0, BOTTOM_NAV_MAX);
  const overflow = items.slice(BOTTOM_NAV_MAX);

  if (shown.length === 0) return null;

  return (
    /*
      ⚠⚠ `role="navigation"` VIA `<nav>` AND ITS OWN LABEL — there are now two
      navigations on a phone page (this and the avatar menu), and a screen reader
      that reads "navigation" twice with no name cannot tell them apart.
    */
    <nav className="pm-bottomnav md:hidden" aria-label="Main menu">
      <ul className="pm-bottomnav-row">
        {shown.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="pm-bottomnav-cell">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                /* ⚠ `min-h-11` IS 44px — the touch standard 88a names, and the
                   same one the tab row already meets. ⚠⚠ The whole cell is the
                   target, not just the glyph. */
                className={
                  "pm-bottomnav-link min-h-11 " + (active ? "is-active" : "")
                }
              >
                <RailIcon name={item.icon} />
                {/* ⚠⚠⚠ THE LABEL IS NOT OPTIONAL (88a). It is what makes this a
                    bar and not a row of guesses. */}
                <span className="pm-bottomnav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/*
        ⚠⚠⚠ THE OVERFLOW HAS A VISIBLE ENTRANCE, ALWAYS (rule 5).
        ⚠ It renders **nothing today** because every role is five or fewer — but
        a sixth item must never simply fall off the end. ⚠⚠ **A CAPABILITY THAT
        DISAPPEARS BECAUSE A LIST GREW IS THE DEFECT `E688` AND `E693` BOTH JUST
        FIXED IN THE MENU**; it would be absurd to re-create it here.
        ⚠ It is a plain expandable row rather than a second drawer: the member is
        already in a bar, and sending them into a panel to reach item six would
        cost more than it saves.
      */}
      {overflow.length > 0 && (
        <details className="pm-bottomnav-more">
          <summary className="pm-bottomnav-link min-h-11">
            <RailIcon name="MoreHorizontal" />
            <span className="pm-bottomnav-label">More</span>
          </summary>
          <ul className="pm-bottomnav-overflow">
            {overflow.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="pm-bottomnav-overflow-link min-h-11">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
