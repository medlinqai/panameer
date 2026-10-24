import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";

// Scott 10-24: the punch-in pages get Panameer's casing — the same dark band and logo as the app, labelled
// "Punch-in Console" — now only on setup / paused / ended pages (PI-E006: a real punch-in opens the app itself).
export default async function PunchoutLayout({ children }: { children: ReactNode }) {
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value).catch(() => null);
  return (
    <>
      <header className="border-b border-white/10 bg-rail px-5 py-2.5 sm:px-6" data-punchout-band>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/panameer-lockup-white.png" alt="Panameer" className="h-6 w-auto" />
            <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-white/45">Punch-in Console</span>
          </div>
          {s && <span className="text-[12.5px] font-semibold text-white/80">Connected to {s.connection.name}</span>}
        </div>
      </header>
      {children}
    </>
  );
}
