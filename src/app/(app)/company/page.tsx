import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { USER_TOS_VERSION } from "@/lib/tos";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { CompanyStepInline } from "@/components/company/CompanyStepInline";
import { LegalLink } from "@/components/legal/LegalLink";
import { loadCompanyView } from "@/lib/company-view";
import { CompanyShell } from "@/components/company/CompanyShell";
import { CompanyDetailsRead, CompanyVerification } from "@/components/company/CompanyOverview";
import { CompanyVisibility } from "@/components/company/CompanyVisibility";
import { CompanySection } from "@/components/company/CompanySection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company · Panameer" };

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Company → Overview (mockup my_company 2026-10-05). Set-up, pending and declined states keep today's flow.
export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ blocked?: string; from?: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  const { blocked, from } = await searchParams;
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
        {blockedCard}
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

  const [view, me] = await Promise.all([
    loadCompanyView(c.id),
    prisma.user.findUnique({ where: { id: viewer.userId }, select: { tos_accepted_at: true, tos_version: true } }),
  ]);
  if (!view) redirect("/company");
  const role = binding.isAdmin ? "admin" : "member";
  return (
    <>
      {blockedMessage && <div className="mx-auto mb-4 w-full max-w-[1010px]">{blockedCard}</div>}
      <CompanyShell c={view} role={role} visibility={<CompanyVisibility on={view.showOnProfiles} canEdit={binding.isAdmin} />}>
        <CompanyDetailsRead c={view} role={role} />
        <CompanyVerification c={view} />
        <CompanySection id="your-terms" title="Your Terms of Service">
          <p className="mt-2.5 text-[14px] text-ink-2">
            {me?.tos_accepted_at
              ? `You accepted the user terms on ${day(me.tos_accepted_at)}${me.tos_version ? `, version ${me.tos_version}` : ""}.`
              : "We don't have a record of you accepting the user terms; you'll be asked at your next sign-in."}
            {me?.tos_accepted_at && me.tos_version !== USER_TOS_VERSION && ` The current version is ${USER_TOS_VERSION} — we'll ask you to accept it next time you sign in.`}{" "}
            <LegalLink href="/terms" className="font-semibold text-magenta-dark underline">
              Read them
            </LegalLink>
            .
          </p>
        </CompanySection>
      </CompanyShell>
    </>
  );
}
