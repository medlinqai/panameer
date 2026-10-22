"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN_MAGENTA, BTN_OUT } from "@/components/hire/HireUI";
import { InterviewDialog } from "@/components/hire/InterviewDialog";

// HL-E003 / CA-E004: one response's actions — Shortlist · Decline · Interview · Request Test · Hire (Hire is the one magenta primary).
export function ProposalActions({ jobId, providerPersonId, testId, awarded, interviewStatus, testStatus, primary = false, proposalId, status, compact = false }: { compact?: boolean; jobId: string; providerPersonId: string; testId: string | null; awarded: boolean; interviewStatus: string | null; testStatus: string | null; primary?: boolean; proposalId?: string; status?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [interviewing, setInterviewing] = useState(false);
  const post = async (path: string, body: object, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch(path.startsWith("/") ? path : `/api/work-requests/${jobId}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMsg(r?.ok ? ok : j.error ?? "Couldn't save — try again.");
    if (r?.ok) router.refresh();
  };
  if (awarded) return <span className="text-[13px] font-bold text-state-accepted">Awarded</span>;
  return (
    <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {proposalId && status === "SUBMITTED" && <button type="button" disabled={busy} onClick={() => post("/api/sourcing", { action: "decide", proposalIds: [proposalId], decision: "SHORTLISTED" }, "Shortlisted.")} className={BTN_OUT}>Shortlist</button>}
      {proposalId && status === "SHORTLISTED" && <span className="text-[13px] font-semibold text-magenta-dark">★ Shortlisted</span>}
      {proposalId && (status === "SUBMITTED" || status === "SHORTLISTED") && <button type="button" disabled={busy} onClick={() => post("/api/sourcing", { action: "decide", proposalIds: [proposalId], decision: "DECLINED" }, "Declined.")} className={BTN_OUT}>Decline</button>}
      {!compact && <>
      <button type="button" disabled={busy || !!interviewStatus} onClick={() => setInterviewing(true)} className={`${BTN_OUT} disabled:opacity-50`}>{interviewStatus ? "Interview Requested" : "Interview"}</button>
      <button type="button" disabled={busy || !testId || !!testStatus} title={testId ? undefined : "No certification test exists for this job's skills yet"} onClick={() => post("test", { providerPersonId, learnAssessmentId: testId }, "Test sent.")} className={`${BTN_OUT} disabled:opacity-50`}>{testStatus ? "Test Sent" : "Request Test"}</button>
      </>}
      <Link href={`/hire/terms?job=${jobId}&provider=${providerPersonId}`} className={primary ? BTN_MAGENTA : BTN_OUT} data-award>Hire</Link>
      {interviewing && <InterviewDialog jobId={jobId} providerPersonIds={[providerPersonId]} onClose={() => setInterviewing(false)} onSent={setMsg} />}
      {msg && <span role="status" className="w-full text-[12.5px] font-semibold text-magenta-dark">{msg}</span>}
    </span>
  );
}
