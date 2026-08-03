import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding, getPendingRequests } from "@/lib/company";
import { COMPANY_TOS_VERSION } from "@/lib/tos";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { CompanyRequests } from "@/components/company/CompanyRequests";
import { AcceptCompanyTos } from "@/components/company/AcceptCompanyTos";

export const dynamic = "force-dynamic";

const TAX_LABELS: Record<string, string> = {
  C_CORP: "C-Corporation",
  S_CORP: "S-Corporation",
  LLC: "LLC",
  PARTNERSHIP: "Partnership",
  SOLE_PROP_INDIVIDUAL: "Sole Proprietor / Individual",
  NONPROFIT: "Non-profit",
};

/**
 * THE COMPANY PAGE (brief_company_model WS3 + WS6).
 *
 * Three jobs on one page because they are one subject:
 *   · what this company IS — legal name, business type, domain, members;
 *   · the COMPANY ToS record, and re-acceptance when the version bumps;
 *   · the ADMIN's queue of pending join requests, with Approve / Reject.
 *
 * The queue lives here rather than in the Panameer admin console on purpose:
 * the approver is the COMPANY's admin — a customer — not Panameer staff.
 */
export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>;
}) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  /*
    `?blocked=` arrives from the WS4 gate. A refusal that just dumps you on a
    page with no explanation reads as a bug; this says which door closed and
    what clears it — and the fix (accept the terms) is on this same page.
  */
  const { blocked } = await searchParams;
  const blockedMessage = blocked
    ? TRANSACT_MESSAGE[blocked.toUpperCase() as keyof typeof TRANSACT_MESSAGE]
    : null;

  const binding = await getCompanyBinding(viewer);
  if (!binding) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {blockedMessage && (
          <Card>
            <h2 className="text-lg">One step first</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">{blockedMessage}</p>
          </Card>
        )}
        <Card>
          <h1 className="text-2xl tracking-tight">No company yet</h1>
          <p className="mt-2 text-black/70 dark:text-white/70">
            You aren&apos;t bound to a company. Everything on Panameer happens
            between companies, so this is the first thing to set up.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Set up my company
          </Link>
        </Card>
      </div>
    );
  }

  const c = binding.company;
  const [requests, members, acceptedBy] = await Promise.all([
    getPendingRequests(viewer),
    prisma.companyMembership.findMany({
      where: { company_id: c.id, status: "APPROVED" },
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        role: true,
        auto_approved: true,
        person: {
          select: {
            first_name: true,
            last_name: true,
            title: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    c.company_tos_accepted_by
      ? prisma.person.findUnique({
          where: { id: c.company_tos_accepted_by },
          select: { first_name: true, last_name: true },
        })
      : null,
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {blockedMessage && (
        <Card>
          <h2 className="text-lg">One step first</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">{blockedMessage}</p>
        </Card>
      )}

      <header>
        <h1 className="text-3xl tracking-tight">{c.name}</h1>
        <p className="mt-1 text-black/60 dark:text-white/60">
          {c.tax_type ? TAX_LABELS[c.tax_type] : "Business type not set"}
          {c.email_domain ? ` · ${c.email_domain}` : ""}
          {binding.isAdmin ? " · You're an admin" : ""}
        </p>
      </header>

      {binding.status === "PENDING" && (
        <Card>
          <h2 className="text-lg">Waiting for approval</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            You asked to join {c.name}. Their admin has to approve it before you
            can transact.
          </p>
        </Card>
      )}

      {binding.status === "REJECTED" && (
        <Card>
          <h2 className="text-lg">That request was declined</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            {c.name} didn&apos;t approve your request. You can ask to join a
            different company, or add your own.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Choose another company
          </Link>
        </Card>
      )}

      {/* ---- WS6: the company ToS record ---------------------------------- */}
      <Card>
        <h2 className="text-lg">Company Terms of Service</h2>
        {binding.tosCurrent ? (
          <p className="mt-2 text-black/70 dark:text-white/70">
            Accepted
            {acceptedBy
              ? ` by ${`${acceptedBy.first_name ?? ""} ${acceptedBy.last_name ?? ""}`.trim()}`
              : ""}{" "}
            on{" "}
            {c.company_tos_accepted_at?.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            , version {c.company_tos_version}.{" "}
            <Link href="/company-terms" className="underline">
              Read them
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 text-black/70 dark:text-white/70">
              {c.company_tos_accepted_at
                ? `This company accepted version ${c.company_tos_version}. The current version is ${COMPANY_TOS_VERSION}, so it needs accepting again.`
                : "This company hasn't accepted the company terms yet. Until it does, it can't transact on Panameer."}{" "}
              <Link href="/company-terms" className="underline">
                Read them
              </Link>
              .
            </p>
            {binding.isAdmin ? (
              <AcceptCompanyTos companyId={c.id} />
            ) : (
              <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                Only a company admin can accept them.
              </p>
            )}
          </>
        )}
      </Card>

      {/* ---- WS3: the admin's approval queue ------------------------------ */}
      {binding.isAdmin && (
        <Card>
          <h2 className="text-lg">
            Join requests
            {requests.length > 0 ? ` (${requests.length})` : ""}
          </h2>
          {requests.length === 0 ? (
            <p className="mt-2 text-black/70 dark:text-white/70">
              Nothing waiting. People whose work email is on{" "}
              {c.email_domain ? <b>{c.email_domain}</b> : "your company's domain"}{" "}
              join without asking; everyone else shows up here.
            </p>
          ) : (
            <CompanyRequests
              requests={requests.map((r) => ({
                id: r.id,
                name: `${r.person.first_name ?? ""} ${r.person.last_name ?? ""}`.trim(),
                email: r.person.user?.email ?? "",
                title: r.person.title,
                company: r.company.name,
                askedAt: r.created_at.toISOString(),
              }))}
            />
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-lg">Members ({members.length})</h2>
        <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline gap-3 py-3">
              <span className="font-medium">
                {`${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim() ||
                  "(unnamed)"}
              </span>
              <span className="text-sm text-black/60 dark:text-white/60">
                {m.person.user?.email}
              </span>
              <span className="ml-auto text-xs font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
                {m.role === "ADMIN" ? "Admin" : m.auto_approved ? "Domain" : "Member"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-black/60 dark:text-white/60">
          Making someone else an admin isn&apos;t built yet — the company&apos;s
          definer is its only approver for now.
        </p>
      </Card>
    </div>
  );
}
