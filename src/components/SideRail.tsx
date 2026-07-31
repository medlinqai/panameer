"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { useMe } from "@/components/MeProvider";
import { navForRoles } from "@/lib/nav";

/**
 * The SIGNED-IN shell: a left role-nav rail (brief_learn_v1 WS3, design doc §6).
 *
 * The switch from the public top nav happens at login — a signed-in person is
 * working, and a rail gives the list somewhere permanent to live as it grows
 * per role, where a top nav would have to start hiding things.
 *
 * Items and their permissions come from `navForRoles`, so this file decides how
 * the nav LOOKS and never what is in it. Learn is in the base set, so it is in
 * every role's rail by construction rather than by remembering to add it.
 *
 * The right-side Medlinq-style taskbar is PARKED per the brief — not built.
 */
export function SideRail({ children }: { children: React.ReactNode }) {
  const { me } = useMe();
  const items = navForRoles(me);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const link = (active: boolean) =>
    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-semibold transition-colors " +
    (active
      ? "bg-magenta/10 text-magenta"
      : "text-ink-2 hover:bg-bg-soft hover:text-ink");

  const nav = (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={link(isActive(item.href))}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-white font-body text-ink">
      {/* Rail — fixed on desktop, a drawer on mobile. */}
      <aside className="hidden w-[232px] shrink-0 border-r border-line lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <Logo priority className="h-7 w-auto" />
          <div className="mt-8 flex-1">{nav}</div>
          {me && (
            <div className="border-t border-line pt-4">
              <UserMenu me={me} />
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile bar — the rail has nowhere to live at this width. */}
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="rounded-lg p-2 text-ink-2 hover:bg-bg-soft"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Logo priority className="h-7 w-auto" />
          <div className="ml-auto">{me && <UserMenu me={me} />}</div>
        </header>
        {open && (
          <div className="border-b border-line px-4 py-3 lg:hidden">{nav}</div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
