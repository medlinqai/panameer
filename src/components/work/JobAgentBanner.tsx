import Link from "next/link";
import { newToday } from "@/lib/job-agent";

// EX-E004: "Panameer Job Agent · n new Oracle jobs today from n sites → See Today's Finds" — hidden when there's nothing new.
export async function JobAgentBanner() {
  const { n, sites } = await newToday().catch(() => ({ n: 0, sites: 0 }));
  if (!n) return null;
  return (
    <Link href="/work/job-agent" className="mb-4 flex flex-wrap items-center gap-x-2 rounded-[12px] border border-ink bg-ink px-4 py-2.5 text-[14px] text-surface hover:opacity-95" data-job-agent-banner>
      <b>Panameer Job Agent</b><span className="opacity-80">·</span>
      <span>{n} new Oracle job{n === 1 ? "" : "s"} today from {sites} site{sites === 1 ? "" : "s"}</span>
      <span className="ml-auto font-bold">See Today&apos;s Finds →</span>
    </Link>
  );
}
