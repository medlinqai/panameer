import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { getPendingRequests, type CompanyBinding } from "@/lib/company";
import { emailDomain, isWorkDomain } from "@/lib/tos";
import { CompanyRequests } from "@/components/company/CompanyRequests";
import { CompanySection, initials } from "@/components/company/CompanySection";
import { AddEmailDomain } from "@/components/company/AddEmailDomain";

// People (mockup company_tabs 2026-10-05): Usage/Health layout — hero, then Members · Asking to Join · How People Join.
export async function CompanyPeople({ viewer, binding }: { viewer: Viewer; binding: NonNullable<CompanyBinding> }) {
  const c = binding.company;
  const admin = binding.isAdmin;
  const [all, requests, me] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { company_id: c.id, status: "APPROVED" },
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
      select: { id: true, role: true, person: { select: { first_name: true, last_name: true, title: true } } },
    }),
    admin ? getPendingRequests(viewer) : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } }),
  ]);
  const members = [...all.filter((m) => m.role === "ADMIN"), ...all.filter((m) => m.role !== "ADMIN")];
  const admins = members.length - all.filter((m) => m.role !== "ADMIN").length;
  const own = emailDomain(me?.email);
  const sentence =
    members.length === 1
      ? c.email_domain
        ? `You're the only one here. Anyone who signs up with an email at ${c.email_domain} can ask to join — you approve each one.`
        : `You're the only one here. Add your email domain and anyone at ${c.name} who signs up with it can ask to join — you approve each one.`
      : c.email_domain
        ? `${members.length} people. Anyone who signs up with an email at ${c.email_domain} can ask to join; an admin approves each one.`
        : `${members.length} people. Add an email domain so colleagues can ask to join.`;
  const slots = Math.max(4, members.length);
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-people>
      <section className="grid items-center gap-x-14 gap-y-6 border-b border-line pb-9 md:grid-cols-[340px_1fr]">
        <div className="text-center">
          <div className="flex justify-center -space-x-2" aria-hidden>
            {Array.from({ length: Math.min(slots, 6) }).map((_, i) => {
              const m = members[i];
              return m ? (
                <span key={i} className={"grid h-14 w-14 place-items-center rounded-full border-2 border-surface text-[15px] font-bold " + (m.role === "ADMIN" ? "bg-ink text-surface" : "bg-[#cfc9db] text-ink")}>
                  {initials(m.person.first_name, m.person.last_name)}
                </span>
              ) : (
                <span key={i} className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#b9b3c6] bg-surface text-[18px] text-ink-3">+</span>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            {members.length} {members.length === 1 ? "person" : "people"} · dashed = room for your team
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">PEOPLE</p>
          <h1 className="mb-5 mt-1.5 text-[30px] font-bold leading-tight">Who&apos;s at {c.name}</h1>
          <div className="flex flex-wrap gap-x-11 gap-y-3 border-b border-line pb-[18px]" data-testid="people-kpis">
            {[
              [members.length, "MEMBERS"],
              [admins, "ADMINS"],
              [admin ? requests.length : "—", "ASKING TO JOIN"],
            ].map(([v, l]) => (
              <div key={l as string}>
                <b className="block text-[26px] font-medium">{v}</b>
                <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">{l}</span>
              </div>
            ))}
          </div>
          <p className="my-[18px] text-[14px] leading-[1.65] text-ink-2">{sentence}</p>
          {admin && !c.email_domain && <AddEmailDomain ownDomain={own && isWorkDomain(own) ? own : null} />}
        </div>
      </section>

      <CompanySection id="members" title="Members" count={members.length}>
        <div className="mt-2">
          {members.map((m) => (
            <div key={m.id} data-member className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-line/60 py-3">
              <span className={"grid h-10 w-10 place-items-center rounded-full text-[13px] font-bold " + (m.role === "ADMIN" ? "bg-ink text-surface" : "bg-[#cfc9db] text-ink")}>
                {initials(m.person.first_name, m.person.last_name)}
              </span>
              <span className="min-w-0">
                <b className="text-[14.5px]">{`${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim() || "(unnamed)"}</b>
                {m.person.title && <span className="block truncate text-[12.5px] text-ink-3">{m.person.title}</span>}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">{m.role === "ADMIN" ? "Admin" : "Member"}</span>
            </div>
          ))}
        </div>
      </CompanySection>

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
              }))}
            />
          )}
        </CompanySection>
      )}

      <CompanySection id="how-people-join" title="How People Join">
        <ol className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            ["1 · They sign up", c.email_domain ? `With an email at ${c.email_domain}.` : "With an email at your domain (add it above)."],
            ["2 · They ask", "Panameer matches the domain and sends your admins the request."],
            ["3 · You approve", "Only admins can approve. Declined people get a polite note."],
          ].map(([t, d]) => (
            <li key={t} className="border-t border-line pt-3">
              <b className="block text-[14.5px]">{t}</b>
              <span className="text-[13.5px] text-ink-2">{d}</span>
            </li>
          ))}
        </ol>
      </CompanySection>
    </div>
  );
}
