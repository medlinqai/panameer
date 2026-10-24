import type { ReactNode } from "react";
import { currentPunchin } from "@/lib/erp/punchin-live";

// PI-E007: a punched-in requester is told where they came from, above their usual dashboard.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const p = await currentPunchin().catch(() => null);
  return (
    <>
      {p?.state === "live" && (
        <p className="mx-auto mb-3 w-full max-w-6xl text-[14px] text-ink-2" data-punchin-welcome>
          You came from <b className="text-ink">{p.erpName}</b>. Shop or Hire here — your cart goes back to {p.erpName} for approval.
        </p>
      )}
      {children}
    </>
  );
}
