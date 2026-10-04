"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/components/MeProvider";
import {
  navForRoles,
  railPersona,
  ADMIN_NAV,
  ADMIN_HOME,
  ADMIN_SETUP,
} from "@/lib/nav";
import { RailIcon } from "@/components/casing/RailIcon";
import { useSession } from "next-auth/react";

export function AppRail() {
  const { me } = useMe();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const items = navForRoles(me);
  const persona = railPersona(me, isAdmin);
  const consoleLabel =
    persona === "PANAMEER"
      ? "Platform Console"
      : persona === "SELLER"
        ? "Provider Console"
        : "Buyer Console";
  const EXACT = new Set(["/dashboard", "/admin"]);
  const isActive = (href: string) =>
    EXACT.has(href) ? pathname === href : pathname.startsWith(href);

  const link = (active: boolean, dense: boolean) =>
    "flex items-center whitespace-nowrap rounded-[8px] px-2.5 " +
    (dense
      ? "gap-3 py-2 text-[14px] leading-[20px] "
      : "gap-2 py-[7px] text-[15px] leading-[22px] ") +
    "font-medium transition-colors " +
    (active
      ? "bg-rail-active text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white");

  const railLink = (
    item: { label: string; href: string; icon?: string },
    dense = true
  ) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={link(isActive(item.href), dense)}
    >
      <RailIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );

  const adminButton = (item: { label: string; href: string; icon?: string }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={
        "flex items-center gap-3 whitespace-nowrap rounded-[8px] border px-2.5 py-[5px] " +
        "text-[14px] font-medium leading-[20px] transition-colors " +
        (isActive(item.href)
          ? "border-rail-active bg-rail-active text-white"
          : "border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/[0.12] hover:text-white")
      }
    >
      <RailIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );

  const personaCaption = persona && (
    <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white/40">
      Main Menu
    </p>
  );

  const nav = isAdmin ? (
    <>
      {personaCaption}
      <div className="mt-1 space-y-1.5">
        {adminButton(ADMIN_SETUP)}
        {adminButton(ADMIN_HOME)}
      </div>

      {}
      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "x"} className="mt-6">
          {group.title && (
            <p className="px-2.5 pb-2 text-[10.5px] font-semibold tracking-[0.09em] text-white/40">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">{group.items.map((i) => railLink(i))}</div>
        </div>
      ))}
    </>
  ) : (
    <>
      {}
      {}
      {personaCaption}
      <div className="space-y-1">
        {items.map((i) => railLink(i, false))}
      </div>
    </>
  );

  const brand = (
    <Link
      href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
      aria-label="Panameer home"
      className="block px-1"
    >
      {}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/panameer-lockup-white.png"
        alt="Panameer"
        className="h-7 w-auto"
      />
      <span className="mt-1 block text-[11.5px] font-medium tracking-wide text-white/45">
        {consoleLabel}
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop rail */}
      {}
      <aside className="hidden w-[240px] shrink-0 bg-rail lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-3 py-4">
          {brand}

          {}
          <nav className="mt-3 min-h-0 flex-1 overflow-y-auto">{nav}</nav>
        </div>
      </aside>

      {/* Mobile: a drawer, since 224px of rail has nowhere to live at 375px. */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 bg-rail px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {brand}
        </div>
        {open && (
          <div className="bg-rail px-4 pb-4">
            <nav>{nav}</nav>
          </div>
        )}
      </div>
    </>
  );
}
