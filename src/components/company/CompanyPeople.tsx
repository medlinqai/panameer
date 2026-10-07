import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { getPendingRequests, type CompanyBinding } from "@/lib/company";
import { emailDomain, isWorkDomain } from "@/lib/tos";
import { CompanyRequests } from "@/components/company/CompanyRequests";
import { CompanySection, KV, initials } from "@/components/company/CompanySection";
import { AddEmailDomain } from "@/components/company/AddEmailDomain";
import { MemberActions } from "@/components/company/MemberActions";

// People (mockup company_area_v3 B): Asking to Join → Members → How People Join.
export async function CompanyPeople({ viewer, binding }: { viewer: Viewer; binding: NonNullable<CompanyBinding> }) {
  const c = binding.company;
  const admin = binding.isAdmin;
  const [all, requests, me, co] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { company_id: c.id, status: "APPROVED" },
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
      select: { id: true, role: true, person_id: true, person: { select: { first_name: true, last_name: true, title: true, user_id: true } } },
    }),
    admin ? getPendingRequests(viewer) : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } }),
    prisma.company.findUnique({ where: { id: c.id }, select: { website_domain: true, website: true } }),
  ]);
  const members = [...all.filter((m) => m.role === "ADMIN"), ...all.filter((m) => m.role !== "ADMIN")];
  const own = emailDomain(me?.email);
  const site = co?.website_domain ?? co?.website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? null;
  const matchedOf = (r: (typeof requests)[number]) => {
    if (r.matched_on) {
      const [kind, value] = r.matched_on.split(":");
      return kind === "email" ? `@${value} email` : kind === "tin" ? "tax ID" : value;
    }
    const d = emailDomain(r.person.user?.email);
    return d && d === r.company.email_domain ? `@${d} email` : null;
  };
  // Just you: a short note instead of the full screen until a second person joins or asks to.
  if (members.length <= 1 && requests.length === 0) {
    return (
      <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-people="solo">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PEOPLE</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight">Who&apos;s at {c.name}</h1>
        <div className="mt-6 border border-ink px-5 py-4">
          <b className="text-[15px]">Just you.</b>
          <p className="mt-1 text-[14px] text-ink-2">
            {site ? (
              <>Others can ask to join by entering <b>{site}</b>. You approve each request.</>
            ) : (
              <>Others can ask to join once your company has a website. You approve each request.</>
            )}
          </p>
          {admin && (
            <div className="mt-3 flex flex-wrap items-start gap-4">
              {!site && (
                <Link href="/company?edit=details#details" className="text-[12.5px] font-bold text-magenta-dark underline underline-offset-2">
                  Add Website
                </Link>
              )}
              <AddEmailDomain ownDomain={own && isWorkDomain(own) ? own : null} current={c.email_domain} />
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-people>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PEOPLE</p>
      <h1 className="mt-1.5 text-[30px] font-bold leading-tight">Who&apos;s at {c.name}</h1>

      {admin && (
        <CompanySection id="asking" title="Asking to Join" count={requests.length}>
          {requests.length === 0 ? (
            <p className="mt-2.5 text-[14px] text-ink-2">Nothing waiting. Requests show here with Approve and Decline.</p>
          ) : (
            <CompanyRequests
              requests={requests.map((r) => ({
                id: r.id,
                name: `${r.person.first_name ?? ""} ${r.person.last_name ?? ""}`.trim(),
                email: r.person.user?.email ?? "",
                title: r.person.title,
                company: r.company.name,
                askedAt: r.created_at.toISOString(),
                matched: matchedOf(r),
              }))}
            />
          )}
        </CompanySection>
      )}

      <CompanySection id="members" title="Members" count={members.length}>
        <div className="mt-2">
          {members.map((m) => {
            const name = `${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim() || "(unnamed)";
            const canChange = admin && m.role !== "ADMIN" && m.person.user_id !== viewer.userId;
            return (
              <div key={m.id} data-member={m.role} className="grid grid-cols-[40px_1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line/60 py-3">
                <span className={"grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold " + (m.role === "ADMIN" ? "bg-ink text-surface" : "bg-[#cfc9db] text-ink")}>
                  {initials(m.person.first_name, m.person.last_name)}
                </span>
                <span className="min-w-0">
                  <b className="text-[14.5px]">{name}</b>
                  {m.person.title && <span className="block truncate text-[12.5px] text-ink-3">{m.person.title}</span>}
                </span>
                <span className="border border-current px-[7px] text-[10.5px] font-bold tracking-[0.06em] text-ink-2">{m.role === "ADMIN" ? "ADMIN" : "MEMBER"}</span>
                {canChange && (
                  <span className="col-span-3 sm:col-span-1 sm:col-start-3 sm:justify-self-end">
                    <MemberActions membershipId={m.id} name={name} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CompanySection>

      <CompanySection id="how-people-join" title="How People Join">
        <KV
          rows={[
            {
              k: "By website",
              v: site ? (
                <span>
                  Anyone who enters <b>{site}</b> can ask to join
                </span>
              ) : null,
              add: admin ? "Add your website on Overview" : "No website yet",
            },
            {
              k: "By work email",
              v: c.email_domain ? (
                <span data-email-domain>
                  @{c.email_domain} · matched at sign-up
                </span>
              ) : null,
              add: "No email domain yet",
            },
            { k: "Approval", v: "An admin approves every request" },
          ]}
        />
        {admin && (
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {!site && (
              <Link href="/company?edit=details#details" className="text-[12.5px] font-bold text-magenta-dark underline underline-offset-2">
                Add Website
              </Link>
            )}
            <AddEmailDomain ownDomain={own && isWorkDomain(own) ? own : null} current={c.email_domain} />
          </div>
        )}
      </CompanySection>
    </div>
  );
}
