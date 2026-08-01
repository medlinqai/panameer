"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import type { Me } from "@/lib/types";
import { membershipBadge } from "@/lib/membership";

/** Header user menu: name + avatar trigger, dropdown with profile + sign out. */
export function UserMenu({ me, dropUp = false }: { me: Me; dropUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Admins get a link into the Platform Console (brief_M) — read from the
  // session so /api/me stays lean.
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;
  const { firstName, lastName, photoUrl } = me.person;
  const badge = membershipBadge(me);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[12px] px-1.5 py-1.5 transition-colors hover:bg-black/[0.04]"
      >
        <Avatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size={32}
        />
        {/*
          Name over BADGE, per the mockup — the chip reads "Scott Walls /
          Freelancer Basic". The badge was missing entirely (E146.2), which left
          the chip saying who you are but nothing about what you are here as.
        */}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[9.5rem] truncate text-[14px] font-bold leading-tight">
            {firstName} {lastName}
          </span>
          {badge && (
            <span className="block max-w-[9.5rem] truncate text-[12px] leading-tight text-ink-2">
              {badge}
            </span>
          )}
        </span>
        <span aria-hidden className="ml-auto hidden text-ink-2 sm:block">
          ›
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={
            "absolute right-0 w-56 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/15 dark:bg-neutral-900 " +
            /*
              DROP-UP when the chip is pinned to the bottom of the full-height
              rail (walk7 WS10 / E138). It opened downward from a trigger sitting
              at the very bottom of the viewport, so Sign Out rendered below the
              fold and there was NO way to log out of the app at all. The rail
              passes dropUp; the mobile header, where the chip is at the top,
              does not.
            */
            (dropUp ? "bottom-full mb-2" : "mt-2")
          }
        >
          <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
            <p className="truncate text-sm font-medium">
              {firstName} {lastName}
            </p>
            {me.person.title && (
              <p className="truncate text-xs text-black/50 dark:text-white/50">
                {me.person.title}
              </p>
            )}
          </div>
          {me.providerProfile && (
            <>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                My Profile
              </Link>
              <Link
                href="/settings/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                Settings
              </Link>
            </>
          )}
          {me.person.roles.isServiceCoordinator && (
            <Link
              href="/coordinator"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Coordinator
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Platform Console
            </Link>
          )}
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-black/[0.04] dark:text-red-400 dark:hover:bg-white/[0.06]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
