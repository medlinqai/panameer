"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import type { Me } from "@/lib/types";

/** Header user menu: name + avatar trigger, dropdown with profile + sign out. */
export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { firstName, lastName, photoUrl } = me.person;

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
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
      >
        <Avatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size={32}
        />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
          {firstName} {lastName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/15 dark:bg-neutral-900"
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
                My profile
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
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-black/[0.04] dark:text-red-400 dark:hover:bg-white/[0.06]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
