"use client";

import { useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { UserMenu } from "@/components/UserMenu";
import { useMe } from "@/components/MeProvider";
import { navForRoles } from "@/lib/nav";

/** The authenticated app header: wordmark, role-aware nav, and user menu. */
export function Header() {
  const { me } = useMe();
  const items = navForRoles(me);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight"
        >
          Panameer
        </Link>

        <NavBar items={items} className="ml-4 hidden items-center gap-1 md:flex" />

        <div className="ml-auto flex items-center gap-2">
          {me ? (
            <UserMenu me={me} />
          ) : (
            <span className="h-8 w-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
          )}
          {items.length > 0 && (
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-black/60 hover:bg-black/[0.05] md:hidden dark:text-white/60 dark:hover:bg-white/[0.08]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {mobileOpen && items.length > 0 && (
        <NavBar
          items={items}
          onNavigate={() => setMobileOpen(false)}
          className="flex flex-col gap-1 border-t border-black/10 px-4 py-3 md:hidden dark:border-white/10"
        />
      )}
    </header>
  );
}
