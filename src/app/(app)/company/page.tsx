import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { CompanyStepInline } from "@/components/company/CompanyStepInline";
import { PendingJoinLine } from "@/components/company/PendingJoinLine";
import { loadCompanyView } from "@/lib/company-view";
import { CompanyShell } from "@/components/company/CompanyShell";
import { CompanyDetailsRead, PayReadyBox } from "@/components/company/CompanyOverview";
import { CompanyVisibility } from "@/components/company/CompanyVisibility";
import { CompanyDetailsEditor, OVERVIEW_FIELDS } from "@/components/company/CompanyDetailsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company · Panameer" };


// Company → Overview (mockup my_company 2026-10-05). Set-up, pending and declined states keep today's flow.
export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ blocked?: string; from?: string; edit?: string; join?: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  const { blocked, from, edit, join } = await searchParams;
  const blockedMessage = blocked ? TRANSACT_MESSAGE[blocked.toUpperCase() as keyof typeof TRANSACT_MESSAGE] : null;
  const binding = await getCompanyBinding(viewer);
  const blockedCard = blockedMessage && (
    <Card>
      <h2 className="text-lg">One Step First</h2>
      <p className="mt-2 text-ink-2">{blockedMessage}</p>
    </Card>
  );

  if (!binding) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {blockedMessage && blockedCard}
        <Card>
          <h1 className="text-2xl tracking-tight">Set Up Your Company</h1>
          <p className="mt-2 text-ink-2">
            Everything on Panameer happens between companies, so this is the first thing to set up. Join the one you work for, or define it if it isn&apos;t here yet.
          </p>
          <div className="mt-6">
            <CompanyStepInline from={from ?? null} />
          </div>
        </Card>
      </div>
    );
  }

  const c = binding.company;
  if (binding.status !== "APPROVED") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {blockedCard}
        {binding.status === "PENDING" ? (
          <Card>
            <h2 className="text-lg">Waiting for Approval</h2>
            <p className="mt-2 text-ink-2">You asked to join {c.name}. Their admin has to approve it before you can transact.</p>
          </Card>
        ) : (
          <Card>
            <h2 className="text-lg">That Request Was Declined</h2>
            <p className="mt-2 text-ink-2">{c.name} didn&apos;t approve your request. You can ask to join a different company, or add your own.</p>
            <Link href="/join" className="mt-5 inline-flex bg-ink px-4 py-2 text-sm font-semibold text-surface hover:bg-ink-hover">
              Choose Another Company
            </Link>
          </Card>
        )}
      </div>
    );
  }

  const editing = edit === "details" && binding.isAdmin;
  const [view, industries] = await Promise.all([
    loadCompanyView(c.id),
    editing
      ? prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  if (!view) redirect("/company");
  const elsewhere = await prisma.companyMembership.findFirst({
    where: { person: { user_id: viewer.userId }, status: "PENDING", company_id: { not: c.id } },
    select: { company: { select: { id: true, name: true } } },
  });
  const role = binding.isAdmin ? "admin" : "member";
  return (
    <>
      {blockedMessage && <div className="mx-auto mb-4 w-full max-w-[1010px]">{blockedCard}</div>}
      <CompanyShell c={view} role={role} visibility={<CompanyVisibility on={view.showOnProfiles} canEdit={binding.isAdmin} />}>
        <CompanyDetailsRead
          c={view}
          role={role}
          editor={
            editing ? (
              <CompanyDetailsEditor
                industries={industries}
                fields={OVERVIEW_FIELDS}
                initial={{
                  name: view.name, legalName: view.legalName, taxType: view.taxTypeCode, country: view.country, stateOfFiling: view.stateOfFiling,
                  ein: null, industryId: view.industryId, website: view.website, description: view.description,
                }}
              />
            ) : undefined
          }
        />
        {binding.isAdmin && <PayReadyBox c={view} />}
        {elsewhere ? (
          <PendingJoinLine companyId={elsewhere.company.id} name={elsewhere.company.name} />
        ) : join === "1" ? (
          <section data-join-other className="mt-8 border-t border-line pt-5">
            <h2 className="text-[19px] font-bold">Join Your Company</h2>
            <div className="mt-3">
              <CompanyStepInline from={null} />
            </div>
          </section>
        ) : (
          <p className="mt-8 text-[13.5px] text-ink-2" data-join-instead>
            Not your company?{" "}
            <Link href="/company?join=1#join" className="font-bold text-magenta-dark underline underline-offset-2">
              Join yours instead
            </Link>
          </p>
        )}
      </CompanyShell>
    </>
  );
}
