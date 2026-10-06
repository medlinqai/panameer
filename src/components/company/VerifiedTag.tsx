import { prisma } from "@/lib/prisma";

// "Verified ✓" = legal and tax details on file (Your Path step 4); shown next to company names.
export async function companyIsVerified(companyId: string) {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { state_of_filing: true, tin: true } });
  return !!c?.state_of_filing?.trim() && !!c?.tin?.trim();
}

export async function VerifiedTag({ companyId }: { companyId: string | null | undefined }) {
  if (!companyId) return null;
  const ok = await companyIsVerified(companyId);
  return (
    <span
      data-verified-tag={ok ? "yes" : "no"}
      title="Verified = legal and tax details on file. Required before a work order is signed."
      className={"ml-2 inline-block border px-[6px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] " + (ok ? "border-[#1f8a5b] text-[#1f8a5b]" : "border-line text-ink-3")}
    >
      {ok ? "VERIFIED ✓" : "NOT YET VERIFIED"}
    </span>
  );
}
