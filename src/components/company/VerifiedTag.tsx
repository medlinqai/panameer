import { companyChecklist } from "@/lib/your-path";

// "Validated ✓" = lifecycle step 5 (legal name, tax ID, W-9 / W-8BEN-E); shown next to company names.
export async function companyIsVerified(companyId: string) {
  return !!(await companyChecklist(companyId))?.ready;
}

export async function VerifiedTag({ companyId }: { companyId: string | null | undefined }) {
  if (!companyId) return null;
  const ok = await companyIsVerified(companyId);
  return (
    <span
      data-verified-tag={ok ? "yes" : "no"}
      title="Validated = legal name, tax ID and W-9 / W-8BEN-E on file. Required before a work order is signed."
      className={"ml-2 inline-block border px-[6px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] " + (ok ? "border-[#1f8a5b] text-[#1f8a5b]" : "border-line text-ink-3")}
    >
      {ok ? "VALIDATED ✓" : "NOT YET VALIDATED"}
    </span>
  );
}
