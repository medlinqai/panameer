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

          {/*
            ⚠ THE SELLER DOOR IS GONE FROM HERE (P1-J0.4-E002). "For Experts"
            rendered as a seventh item, set apart by a left border; Scott removed
            it on 2026-08-15 for header crowding. The six above are the whole
            nav. `/find-work` is a header item again (E029) — see the note
            on MARKETING_PROVIDER_DOOR, which is kept for the paper trail.
          */}
        </nav>

        {/*
          `ml-auto` is gone: the nav's `flex-1` now owns the slack, and leaving
          an auto margin here would fight it for the same space and pull the
          nav back off centre.
        */}
        {/*
          ── ⚠ THE AUTH CLUSTER JOINS AT lg, NOT md (P1-ALL-E004) ──────────────

          This header overflowed every public page except `/` at exactly 768 and
          for ~27px above it. Same defect class as `P1-ALL-E001` in the app
          header, fixed at `c192009`: fixed, `shrink-0` clusters colliding at a
          named breakpoint.

          THE ARITHMETIC, measured on /hire-talent at 768 rather than derived:

            logo            159   shrink-0
            nav             336   shrink-1, but nowrap children floor it here
            Log In/Sign Up  212   shrink-0
            gap-8 x2         64
            px-6  x2         48
                            ───
                            819   required, against 768 available

          ⚠ `scrollWidth` REPORTED 795, NOT 819. It omits the end padding once
          content overflows (`pitfalls.md`, `c192009`) — 795 + 24 = 819. Budgeting
          against the reported figure would have left the fix 24px short, which is
          exactly how the app-header fix nearly went wrong.

          `md` is 768, so the nav AND the auth cluster both switched on at the one
          width where the ☰ switched off — three desktop pieces at their tightest
          and two of them unable to give.

          THE SMALLEST NAMED BREAKPOINT THAT CLEARS 819 IS lg (1024):

            at 1024   159 + 354 (nav at its lg gap) + 212 + 64 + 48 = 837  ✓
            at 1023   159 + 336 + 21 (☰) + 64 + 48          = 628  ✓
            at  768   same 628                                       ✓

          ⚠ THE AUTH CLUSTER GIVES, NOT THE NAV, and not the type size. It is
          212px of the 819 and the ☰ drawer below already contains BOTH buttons —
          verified in the DOM, not assumed — so nothing becomes unreachable. The
          four labels stay visible from 768 because a tablet has room for them:
          628 of 768.

          ── ⚠ RE-MEASURED 2026-08-21, SIX ITEMS (P1-J0-E245) ─────────────────

          `MARKETING_NAV` went from four to six. Two labels SHORTENED and two were
          added, so the net was genuinely unknown and was measured on the real
          page rather than derived. It went UP, because the two new words are the
          two longest in the set AND each one also buys a 34px gap:

            Learn      43.63     Shop       39.70
            Talent     48.98     Optimize   70.95     <- new, longest
            Work       41.77     Integrate  71.09     <- new, longest
                                 ────────────────
            labels    316.12  +  5 gaps x 34 = 486.12 nav required

          Worst public page is /hire-talent and /find-work (their auth cluster is
          212.20; `/` is lighter at 202.78):

            at 1024   158.78 + 486.12 + 212.20 + 64 + 48 = 969.10  vs 1024  ✓
            at 1023   158.78 + 456.12 + 21.11 (☰) + 64 + 48 = 748.01 vs 1023 ✓

          ⚠ MEASURED ON ELEMENT RECTS, NOT `scrollWidth`. scrollWidth reported
          1024 flat — it clamps to the viewport when nothing overflows and omits
          end padding when something does (`pitfalls.md`, `P1-ALL-E001`), so it
          cannot answer "how much room is left". The harness reproduced the 837
          figure above exactly (836.86) before it was trusted for the new one.

          ⚠ `lg` STILL CLEARS AND NO BREAKPOINT MOVED — but the slack fell from
          187.14 to 54.90. That is the whole remaining budget at `lg`: a SEVENTH
          item, or a longer word in place of any of the six, overflows here first.
          Re-measure rather than eyeballing it.
        */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {/*
            E003 — LOG IN IS A CONTROL NOW, not bold body text. It was
            `font-bold` with no colour of its own, inheriting `--color-ink`,
            which the dark theme repoints to near-white — on a header whose
            `bg-white/90` the dark theme never repainted. White on white; it
            only appeared when you selected it. The surface is theme-locked now
            (globals.css), and this is additionally a ghost button: an explicit
            colour, a border, and the secondary half of the button standard
            beside Sign Up's solid primary.
          */}
          {signedIn ? (
            /*
              ⚠⚠ THE CHIP REPLACES BOTH BUTTONS (`E306`). ⚠ SUPERSEDED, quoted:
              `<Btn href="/login" variant="white">Log In</Btn>` and
              `<Btn href="/join">Sign Up</Btn>`, rendered unconditionally on all 19
              surfaces. `Sign Up` shown to a signed-in user is the live harm this kills.
              ⚠ `AccountMenu` IS REUSED, NOT REBUILT — the same identity control the app
              shell uses, so Sign Out cannot drift into two behaviours. It works here
              only because of the header-local `MeProvider`.
              ⚠ THE CHIP AND SIGN OUT STAY LIVE IN EVERY STATE, published or not.
            */
            <>
              {/*
                ⚠⚠ THE WAY BACK IN (`P2-J1.1-E001` D-1). The chip alone was not
                one: it opens a MENU, and Scott's words were *"this is not an
                easy or obvious choice."* This is a labelled destination sitting
                in the primary slot — the same slot `Sign Up` occupies for an
                anonymous visitor, which is the slot a signed-in member's
                primary action belongs in.

                ⚠⚠ IT IS ONE CONTROL, NOT A SECOND CASING. `AppHeader` is NOT
                mounted here and must not be: search, notifications and
                bug-report are app-shell affordances a signed-out visitor must
                never see, and this file's own docblock records that TWO HEADERS
                ON ONE PRODUCT (`PublicTopNav`, since retired) was the previous
                defect. One `Btn` from the shared brand module — the same button
                standard as every other control in this row.
              */}
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

        {/*
          ⚠ lg, MATCHING THE AUTH CLUSTER. If this stayed `md:hidden` while the
          buttons moved to `lg:flex`, then between 768 and 1023 there would be no
          Log In and no Sign Up ANYWHERE — the row would not have them and the ☰
          that carries them would be hidden. That is the trap in moving one
          breakpoint without the other, and it is why the guard asserts both
          buttons have non-zero size at EVERY width rather than only at the ends.
        */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          /* ⚠⚠ `min-[1100px]:hidden`, MATCHING THE NAV — see the block above the
             `<nav>`. It still also matches the auth cluster's need: the cluster shows
             from `lg` (1024), and between 1024 and 1099 this ☰ is what carries the NAV
             LINKS while the cluster carries the buttons, so both exist at every width.
             ⚠ SUPERSEDED, quoted not deleted (`E164`):
             //   className="ml-auto cursor-pointer text-2xl lg:hidden" */
          className="ml-auto cursor-pointer text-2xl min-[1100px]:hidden"
        >
          ☰
        </button>
      </div>

      {/*
        ⚠ THE DRAWER KEEPS EVERYTHING, including the six nav items that are also
        visible in the row between 768 and 1023. The duplication is deliberate:
        one drawer with the same contents at every width beats a drawer whose
        contents change at a breakpoint, and a person who opens it at 800px and
        finds the nav there is not surprised by it.
      */}
      {/* ⚠ THE PANEL'S BREAKPOINT MOVED WITH THE ☰ (`P2-ALL-E699`) — a toggle whose
          panel cannot render is a control that does nothing.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   className="border-t border-line bg-white px-6 py-4 lg:hidden" */}
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
                    /*
                      ⚠ THE `item.primary` BRANCH IS GONE HERE TOO (E028). The
                      drawer carried the SAME unconditional `text-magenta` as the
                      desktop nav did, so the bug was in both renderings — the
                      brief only named the desktop one. Leaving it would have
                      left a second copy of the defect waiting for the next
                      promoted item, and contradicted the weight-vs-colour rule
                      recorded above.
                    */
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
                /* ⚠ SAME RULE IN THE MOBILE SHEET (`E306`) — this row offered `Sign Up`
                   to a signed-in user too. `variant="rail"` gives the stacked
                   avatar + name form the sheet has room for. */
                /* ⚠ THE SHEET GETS THE SAME CONTROL — a member who opened the
                   mobile menu to find the way back must find it there too. */
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
