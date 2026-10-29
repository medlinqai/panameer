import Link from "next/link";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";
import type { ExternalCard } from "@/lib/external-jobs";

// XA-E002: an external job row's right side — your stage once you've applied, else Apply on Panameer. Admins also get the original.
export function ExternalRowAction({ e, admin }: { e: ExternalCard; admin: boolean }) {
  return (
    <>
      {e.stage ? <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${e.stageKey === "CHOSEN" ? "bg-state-accepted-bg text-state-accepted" : e.stageKey === "NOT_SELECTED" || e.stageKey === "CLOSED" ? "bg-state-inactive-bg text-state-inactive" : "bg-state-pending-bg text-state-pending"}`} data-external-stage>{e.stage}</span> : null}
      <Link href={e.claimedJobId ? `/work/jobs/${e.claimedJobId}` : `/work/external/${e.id}`} className={e.stage ? BTN_OUT : BTN}>{e.stage ? "View" : "Apply on Panameer"}</Link>
      {admin && <a href={e.url} target="_blank" rel="noreferrer nofollow" className={BTN_OUT}>Open Original ↗</a>}
    </>
  );
}
