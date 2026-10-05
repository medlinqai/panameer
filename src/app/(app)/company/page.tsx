import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding, getPendingRequests } from "@/lib/company";
import { COMPANY_TOS_VERSION, USER_TOS_VERSION } from "@/lib/tos";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { CompanyRequests } from "@/components/company/CompanyRequests";
import { CompanyDetailsForm } from "@/components/company/CompanyDetailsForm";
import { TAX_LABELS } from "@/lib/tax-types";
import { CompanyStepInline } from "@/components/company/CompanyStepInline";
import { AcceptCompanyTos } from "@/components/company/AcceptCompanyTos";
import { LegalLink } from "@/components/legal/LegalLink";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; from?: string }>;
}) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  const { blocked, from } = await searchParams;
  const blockedMessage = blocked
    ? TRANSACT_MESSAGE[blocked.toUpperCase() as keyof typeof TRANSACT_MESSAGE]
    : null;

  const binding = await getCompanyBinding(viewer);
  if (!binding) {
    return (
      <>
        {}
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {blockedMessage && (
          <Card>
            <h2 className="text-lg">One Step First</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">{blockedMessage}</p>
          </Card>
        )}
        <Card>
          <h1 className="text-2xl tracking-tight">Set Up Your Company</h1>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Everything on Panameer happens between companies, so this is the
            first thing to set up. Join the one you work for, or define it if
            it isn&apos;t here yet.
          </p>
          <div className="mt-6">
            <CompanyStepInline from={from ?? null} />
          </div>
        </Card>
      </div>
      </>
    );
  }

  const c = binding.company;
  const [requests, members, acceptedBy, me] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { tos_accepted_at: true, tos_version: true },
    }),
  ]);

  // TWO TIERS, shown together (WS6). The company terms bind the entity; these
  // bind the person, and they are different agreements accepted at different
  // moments — so a page that showed only one would answer half the question.
  const userTosCurrent =
    !!me?.tos_accepted_at && me.tos_version === USER_TOS_VERSION;

  return (
    <>
      {}
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {blockedMessage && (
        <Card>
          <h2 className="text-lg">One Step First</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">{blockedMessage}</p>
        </Card>
      )}

      <header className="flex flex-wrap items-center gap-4">
        {}
        {c.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.logo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-[12px] border border-black/10 bg-white object-contain p-1 dark:border-white/15"
          />
        )}
        <span className="min-w-0">
        <h1 className="text-3xl tracking-tight">{c.name}</h1>
        <p className="mt-1 text-black/60 dark:text-white/60">
          {c.tax_type ? TAX_LABELS[c.tax_type] : "Business type not set"}
          {c.email_domain ? ` · ${c.email_domain}` : ""}
          {binding.isAdmin ? " · You're an admin" : ""}
        </p>
        </span>
      </header>

      {binding.status === "PENDING" && (
        <Card>
          <h2 className="text-lg">Waiting for Approval</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            You asked to join {c.name}. Their admin has to approve it before you
            can transact.
          </p>
        </Card>
      )}

      {binding.status === "REJECTED" && (
        <Card>
          <h2 className="text-lg">That Request Was Declined</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            {c.name} didn&apos;t approve your request. You can ask to join a
            different company, or add your own.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Choose another company
          </Link>
        </Card>
      )}

      {/*
        ── ⚠⚠⚠ THE COMPANY DETAILS, EDITABLE (brief 10 — `P2-A2-E661`) ──────

        ⚠ **SCOTT: *"I cannot edit any of the data."*** ⚠⚠ Measured before
        building (`69a` — is something already doing this better?):
        `/company/settings` EXISTS and is **a placeholder** — *"The route, its
        title and its gate are real; only the content is pending."* — and the
        only `Company` writers were `defineCompany` (creation) and
        `saveCompanyName` (the wizard step). ⚠⚠⚠ **NOTHING COULD EDIT A DEFINED
        COMPANY.**

        ⚠⚠ **IT IS HERE, WHERE THE DATA IS READ, NOT ONE PAGE AWAY.** This route
        already carries the scar: `P1-J1.2-E004` records Scott blocked because
        *"I was forced to do something with my company details and I couldn't"*.
        A second page to go and edit on is the same shape.

        ⚠⚠⚠ **ADMIN ONLY, AND THE GATE IS THE WRITER'S, NOT THIS COMPONENT'S.**
        `updateCompanyDetails` refuses anyone who is not an APPROVED ADMIN,
        resolved from the session. ⚠ This `isAdmin` branch decides what to
        DRAW; it is not what enforces anything — the three-layer rule.
        ⚠⚠ **A NON-ADMIN IS TOLD WHO CAN, RATHER THAN SHOWN NOTHING** — the
        same shape the ToS card below already uses (*"Only a company admin can
        accept them."*). ⚠ `53b` — a control not drawn for somebody entitled to
        press it is a defect; so is silence for somebody who is not.
      */}
      <Card>
        <h2 className="text-lg">Company Details</h2>
        {binding.isAdmin && binding.status === "APPROVED" ? (
          <CompanyDetailsForm
            initial={{
              name: c.name,
              legalName: c.legal_name,
              taxType: c.tax_type,
              country: c.country,
              stateOfFiling: c.state_of_filing,
              ein: c.tin,
            }}
          />
        ) : (
          <p className="mt-2 text-black/70 dark:text-white/70">
            Only a company admin can change these details.
          </p>
        )}
      </Card>

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
            <LegalLink href="/company-terms" className="underline">
              Read them
            </LegalLink>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 text-black/70 dark:text-white/70">
              {c.company_tos_accepted_at
                ? `This company accepted version ${c.company_tos_version}. The current version is ${COMPANY_TOS_VERSION}, so it needs accepting again.`
                : "This company hasn't accepted the company terms yet. Until it does, it can't transact on Panameer."}{" "}
              <LegalLink href="/company-terms" className="underline">
                Read them
              </LegalLink>
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

      <Card>
        <h2 className="text-lg">Your Terms of Service</h2>
        {me?.tos_accepted_at ? (
          <p className="mt-2 text-black/70 dark:text-white/70">
            You accepted the user terms on{" "}
            {me.tos_accepted_at.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {me.tos_version ? `, version ${me.tos_version}` : ""}.
            {!userTosCurrent && (
              <>
                {" "}
                The current version is {USER_TOS_VERSION} — we&apos;ll ask you to
                accept it next time you sign in.
              </>
            )}{" "}
            <LegalLink href="/terms" className="underline">
              Read them
            </LegalLink>
            .
          </p>
        ) : (
          <p className="mt-2 text-black/70 dark:text-white/70">
            We don&apos;t have a record of you accepting the user terms. Accounts
            created before we started recording the version are in this state —
            you&apos;ll be asked at your next sign-in.{" "}
            <LegalLink href="/terms" className="underline">
              Read them
            </LegalLink>
            .
          </p>
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
        {/* The `#members` anchor E225 keeps on the page after removing the
            menu entry that used to point at it. */}
        <h2 id="members" className="scroll-mt-6 text-lg">
          Members ({members.length})
        </h2>
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
    </>
  );
}
