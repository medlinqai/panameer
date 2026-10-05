import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { getPendingRequests, type CompanyBinding } from "@/lib/company";
import { CompanyRequests } from "@/components/company/CompanyRequests";
import { CompanySection, initials } from "@/components/company/CompanySection";

// People: members with role; admins also see "Asking to join (N)" with Decline / Approve.
export async function CompanyPeople({ viewer, binding }: { viewer: Viewer; binding: NonNullable<CompanyBinding> }) {
  const c = binding.company;
  const [members, requests] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { company_id: c.id, status: "APPROVED" },
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
      select: { id: true, role: true, auto_approved: true, person: { select: { first_name: true, last_name: true, title: true } } },
    }),
    binding.isAdmin ? getPendingRequests(viewer) : Promise.resolve([]),
  ]);
  return (
    <CompanySection
      id="people"
      title="People"
      count={members.length}
      actions={<Link href="/invite-colleague">Invite</Link>}
    >
      <div id="members" className="mt-2">
        {members.map((m) => (
          <div key={m.id} data-member className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-line/60 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#cfc9db] text-[13px] font-bold text-ink">{initials(m.person.first_name, m.person.last_name)}</span>
            <span className="min-w-0">
              <b className="text-[14.5px]">{`${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim() || "(unnamed)"}</b>
              {m.person.title && <span className="block truncate text-[12.5px] text-ink-3">{m.person.title}</span>}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
              {m.role === "ADMIN" ? "Admin" : m.auto_approved ? "Domain" : "Member"}
            </span>
          </div>
        ))}
      </div>
      {binding.isAdmin && (
        <>
          <p className="mb-2 mt-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">Asking to join ({requests.length})</p>
          {requests.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">
              Nothing waiting. People with {c.email_domain ? <b>{c.email_domain}</b> : "your company's email domain"} join without asking; everyone else shows up here.
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
        </>
      )}
    </CompanySection>
  );
}
