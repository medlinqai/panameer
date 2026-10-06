"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MeProvider, useMe } from "@/components/MeProvider";
import { AccountMenu } from "@/components/casing/AccountMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MARKETING_NAV,
  Btn,
} from "@/components/marketing/brand";
import { Logo } from "@/components/Logo";

function useAppHome(signedIn: boolean) {
  const [home, setHome] = useState("/dashboard");
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch("/api/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && typeof d?.home === "string" && d.home) setHome(d.home);
      })
      .catch(() => {
        /* the default stands — a dead fetch must not remove the way back */
      });
    return () => {
      alive = false;
    };
  }, [signedIn]);
  return home;
}

export function MarketingHeader() {
  const { status } = useSession();
  if (status === "authenticated") {
    return (
      <MeProvider>
        <MarketingHeaderInner signedIn />
      </MeProvider>
    );
  }
  return <MarketingHeaderInner signedIn={false} />;
}

function MarketingHeaderInner({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const appHome = useAppHome(signedIn);
  const pathname = usePathname();
  const { me } = useMe();
  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="marketing-surface sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-[10px] backdrop-saturate-150">
      <div className="mx-auto flex h-[70px] max-w-[1180px] items-center gap-8 px-6">
        {}
        {}
        <div className="flex shrink-0 items-center">
          {}
          {}
          <Logo className="h-8 w-auto -translate-y-[3px]" priority />
        </div>

        {}
        {}
        <nav className="hidden flex-1 justify-center gap-7 text-[15px] font-semibold text-ink-2 min-[1100px]:flex lg:gap-[34px]">
          {MARKETING_NAV.map((item, i) => {
            const on = isActive(item.href);
            return (
              <Link
                key={`${item.label}-${i}`}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={
                  "whitespace-nowrap transition-colors hover:text-magenta " +
                  (on ? "font-bold text-magenta" : "")
                }
              >
                {item.label}
              </Link>
            );
          })}

          {/* THE SELLER DOOR IS GONE FROM HERE . "For Experts" */}
        </nav>

        {/* an auto margin here would fight it for the same space and pull the */}
        {/* THE AUTH CLUSTER JOINS AT lg, NOT md */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {/* E003 — LOG IN IS A CONTROL NOW, not bold body text. It was */}
          {signedIn ? (
            // THE CHIP REPLACES BOTH BUTTONS .
            <>
              {/* THE WAY BACK IN D-1). The chip alone was not */}
              <Btn href={appHome}>Go to the App</Btn>
              <AccountMenu isAdmin={Boolean(me?.person?.roles?.isSupport)} />
            </>
          ) : (
            <>
              <Btn href="/login" variant="white">
                Log In
              </Btn>
              <Btn href="/join">Sign Up</Btn>
            </>
          )}
        </div>

        {/* lg, MATCHING THE AUTH CLUSTER. If this stayed `md:hidden` while the */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          // from `lg` (1024), and between 1024 and 1099 this ☰ is what carries the NAV
          className="ml-auto cursor-pointer text-2xl min-[1100px]:hidden"
        >
          ☰
        </button>
      </div>

      {/* THE DRAWER KEEPS EVERYTHING, including the six nav items that are also */}
      {/* THE PANEL'S BREAKPOINT MOVED WITH THE ☰ — a toggle whose */}
      {open && (
        <div className="border-t border-line bg-white px-6 py-4 min-[1100px]:hidden">
          <nav className="flex flex-col gap-1 text-[15px] font-semibold text-ink-2">
            {MARKETING_NAV.map((item, i) => {
              const on = isActive(item.href);
              return (
                <Link
                  key={`${item.label}-${i}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={
                    // THE `item.primary` BRANCH IS GONE HERE TOO (E028). The
                    "px-2 py-2 hover:bg-bg-soft hover:text-magenta " +
                    (on ? "font-bold text-magenta" : "")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center gap-3 border-t border-line pt-3">
              {signedIn ? (
                // SAME RULE IN THE MOBILE SHEET — this row offered `Sign Up`
                // THE SHEET GETS THE SAME CONTROL — a member who opened the
                <>
                  <Btn href={appHome}>Go to the App</Btn>
                  <AccountMenu isAdmin={Boolean(me?.person?.roles?.isSupport)} variant="rail" />
                </>
              ) : (
                <>
              <Btn href="/login" variant="white">
                Log In
              </Btn>
              <Btn href="/join" className="ml-auto">
                Sign Up
              </Btn>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
