"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN_MAGENTA, BTN_OUT } from "@/components/hire/HireUI";

// HL-E003: one proposal's actions — Interview · Request Test · Award (Award is the one magenta primary).
export function ProposalActions({ jobId, providerPersonId, testId, awarded, interviewStatus, testStatus, primary = false }: { jobId: string; providerPersonId: string; testId: string | null; awarded: boolean; interviewStatus: string | null; testStatus: string | null; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const post = async (path: string, body: object, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/work-requests/${jobId}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r?.ok ? ok : j.error ?? "Couldn't save — try again.");
    if (r?.ok) router.refresh();
  };
  if (awarded) return <span className="text-[13px] font-bold text-state-accepted">Awarded</span>;
  return (
    <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <button type="button" disabled={busy || !!interviewStatus} onClick={() => post("interview", { providerPersonId }, "Interview requested.")} className={`${BTN_OUT} disabled:opacity-50`}>{interviewStatus ? "Interview requested" : "Interview"}</button>
      <button type="button" disabled={busy || !testId || !!testStatus} title={testId ? undefined : "No certification test exists for this job's skills yet"} onClick={() => post("test", { providerPersonId, learnAssessmentId: testId }, "Test sent.")} className={`${BTN_OUT} disabled:opacity-50`}>{testStatus ? "Test sent" : "Request Test"}</button>
      <Link href={`/hire/terms?job=${jobId}&provider=${providerPersonId}`} className={primary ? BTN_MAGENTA : BTN_OUT} data-award>Award</Link>
      {msg && <span role="status" className="w-full text-[12.5px] font-semibold text-magenta-dark">{msg}</span>}
    </span>
  );
}
