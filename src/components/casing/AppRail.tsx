"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/components/MeProvider";
import { navForRoles, HOME_NAV, ADMIN_NAV, ADMIN_HOME, ADMIN_SETUP } from "@/lib/nav";
import { useSession } from "next-auth/react";

/**
 * The dark rail (MASTER WS9/WS11, ref E151 + Medlinq Sidebar).
 *
 * Structure is Medlinq's — brand mark, company chip, a highlighted home entry,
 * an "Applications" group, and a signed-in card pinned to the bottom — on
 * Panameer's palette: #140c29 rail, #d127d0 active pill, both measured off the
 * mockup.
 *
 * ITEMS COME FROM nav.ts, not from a list here. That rule survived the reskin
 * deliberately: the old rail and the public top nav already share one
 * definition, and hard-coding the mockup's eight labels would have re-created
 * exactly the drift that single definition exists to prevent.
 *
 * THE BOTTOM CARD KEEPS ITS OWN SIGN OUT (E153, as Medlinq has it) even though
 * the header avatar menu is "the only logout" (E152). Those aren't in conflict:
 * E138 was that logout was UNREACHABLE, and the header menu is the canonical
 * home for it. This card is the same action where Medlinq's users already reach
 * for it, and a second door to sign-out has never confused anybody.
 */
export function AppRail() {
  const { me } = useMe();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
    ADMIN vs PROVIDER rail. `isSystemAdmin` lives on the session rather than on
    /api/me — `Me` carries ACTOR flags (provider/buyer/coordinator) and the
    admin bit is deliberately not one of them, so it is read from the session
    the same way the Platform Console link already does.
  */
  const { data: session } = useSession();
  const isAdmin = session?.user?.isSystemAdmin === true;

  const items = navForRoles(me);
  const consoleLabel = isAdmin ? "Platform Console" : "Provider Console";
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const first = me?.person.firstName ?? "";
  const last = me?.person.lastName ?? "";
  const company = me?.company?.name;

  const link = (active: boolean) =>
    "block rounded-[10px] px-4 py-2 text-[17px] font-semibold transition-colors " +
    (active
      ? "bg-magenta text-white"
      : "text-white/75 hover:bg-white/10 hover:text-white");

  const railLink = (item: { label: string; href: string }, indent = true) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={
        link(isActive(item.href)) +
        (indent ? " pl-6 text-[15.5px] font-semibold" : "")
      }
    >
      {item.label}
    </Link>
  );

  const nav = isAdmin ? (
    /* E009 — Setup & Maintenance, the dashboard home, then three groups. */
    <>
      <Link
        href={ADMIN_SETUP.href}
        onClick={() => setOpen(false)}
        className="mb-2 block rounded-[10px] border border-white/20 px-4 py-2 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
      >
        {ADMIN_SETUP.label}
      </Link>
      {railLink(ADMIN_HOME, false)}

      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "x"} className="mt-6">
          {group.title && (
            <p className="px-4 text-[16px] font-bold text-white">{group.title}</p>
          )}
          <div className="mt-1 space-y-0.5">
            {group.items.map((i) => railLink(i))}
          </div>
        </div>
      ))}
    </>
  ) : (
    <>
      {railLink(HOME_NAV, false)}
      <p className="mt-7 px-4 text-[19px] font-bold text-white">Applications</p>
      <div className="mt-1.5 space-y-0.5">{items.map((i) => railLink(i))}</div>
    </>
  );

  const signedInCard = me && (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.07] p-3">
      <div className="flex items-center gap-3">
        <Avatar firstName={first} lastName={last} photoUrl={me.person.photoUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/45">Signed in As</p>
          <p className="truncate text-[13.5px] font-bold text-white">
            {`${first} ${last}`.trim() || "Signed in"}
          </p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-0.5 text-[11px] text-white/45 hover:text-white hover:underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const brand = (
    <Link
      href={isAdmin ? ADMIN_HOME.href : "/dashboard"}
      aria-label="Panameer home"
      className="block px-1"
    >
      {/*
        E002 — the LOGO ASSET IS STILL THE OLD WORDMARK, and that is a blocked
        item rather than an oversight. The brief says to use "the on-dark
        version supplied now"; nothing new is in the repo — public/brand holds
        only the thin lowercase mark E002 is complaining about. So the existing
        on-dark asset renders (it is the right one FOR a dark rail) and both the
        new on-dark and the new on-white assets are reported as pending.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/panameer-logo-on-dark.png"
        alt="Panameer"
        className="h-7 w-auto"
      />
      <span className="mt-1.5 block text-[12.5px] font-semibold tracking-wide text-white/55">
        {consoleLabel}
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-[224px] shrink-0 bg-rail lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          {brand}

          {company && (
            <div className="mt-6 flex items-center gap-3 px-1">
              {me?.company?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={me.company.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-[8px] object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-white/10 text-[13px] font-bold text-white/70">
                  {company.slice(0, 2).toUpperCase()}
                </span>
              )}
              <p className="min-w-0 truncate text-[18px] font-bold text-white">
                {company}
              </p>
            </div>
          )}

          <nav className="mt-7 flex-1 overflow-y-auto">{nav}</nav>
          <div className="pt-3">{signedInCard}</div>
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
            <div className="pt-4">{signedInCard}</div>
          </div>
        )}
      </div>
    </>
  );
}
