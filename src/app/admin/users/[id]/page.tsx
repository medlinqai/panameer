import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { jobsFor } from "@/lib/user-jobs";
import { LifecycleStrip } from "@/components/lifecycle/LifecycleStrip";
import { lifecycleFor, companyChecklist } from "@/lib/your-path";
import { buildCompletenessInput } from "@/lib/onboarding";
import { missingRequired, VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { UserEditPanel } from "@/components/admin/UserEditPanel";
import { ResendVerification } from "@/components/admin/ResendVerification";
import { MarkVerified, NudgeToFinish, AddToCompany } from "@/components/admin/LifecycleFixes";

export const dynamic = "force-dynamic";

// Admin › Users › one person (mockup admin_user_detail 2026-10-06): status first, then one section per lifecycle step with its fixes.
const d = (v: Date | null | undefined) => (v ? v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dt = (v: Date) => v.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const No = ({ children }: { children: ReactNode }) => <span className="text-ink-3">{children}</span>;

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line/60 py-2 last:border-0">
      <span className="w-[160px] shrink-0 text-[12.5px] text-ink-2">{label}</span>
      <span className="min-w-0 text-[14px]">{value}</span>
    </div>
  );
}

function Step({ n, title, tag, tone, actions, children }: { n: string; title: string; tag: string; tone: "done" | "wait" | "none"; actions?: ReactNode; children: ReactNode }) {
  return (
    <section data-step-section={n} className="border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[17px] font-bold">
          {n} {title}
        </h2>
        <span className={"border px-1.5 text-[10.5px] font-bold tracking-[0.06em] " + (tone === "done" ? "border-[#1f8a5b] text-[#1f8a5b]" : tone === "wait" ? "border-[#b26b00] text-[#b26b00]" : "border-line text-ink-3")}>{tag}</span>
        {actions && <span className="ml-auto flex flex-wrap items-center gap-2">{actions}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const CHECK: [string, string][] = [
  ["Photo", "a photo"], ["Title", "a title"], ["Role", "a role"], ["Bio (100+)", "a bio of at least 100 characters"],
  ["3 skills", "at least three skills"], ["Specialization", "at least one specialization"], ["Rate", "your rate"],
  ["Language", "at least one language"], ["Location", "your location"], ["Address", "your address"], ["Phone", "your phone number"],
];
const SIGNED = ["ACCEPTED", "RELEASED", "ACTIVE", "CLOSED"] as const;

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true, user_id: true, first_name: true, last_name: true, phone: true, created_at: true,
      is_service_buyer: true, is_service_provider: true, is_service_coordinator: true,
      user: { select: { email: true, email_verified: true, tos_accepted_at: true, locked: true, last_login: true, is_active: true, is_test: true } },
      requesterProfile: { select: { id: true, completed_at: true } },
      buyerProfile: { select: { id: true } },
      providerProfile: { select: { id: true, completeness: true, paused_at: true, onboarding_completed_at: true } },
      companyMemberships: { orderBy: { updated_at: "desc" }, select: { status: true, role: true, decided_at: true, created_at: true, company: { select: { id: true, name: true, legal_name: true, tin: true, country: true, tax_form_uploaded_at: true, p_account_id: true } } } },
    },
  });
  if (!person) notFound();
  const u = person.user;
  const userId = person.user_id;
  const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "(unnamed)";
  const member = person.companyMemberships.find((m) => m.status === "APPROVED") ?? null;
  const pending = person.companyMemberships.filter((m) => m.status === "PENDING");
  const co = member?.company ?? null;

  const [path, input, check, verifySent, counts, audit, coPayouts] = await Promise.all([
    lifecycleFor(person.id),
    person.providerProfile ? buildCompletenessInput(person.providerProfile.id) : Promise.resolve(null),
    co ? companyChecklist(co.id, { payout: person.is_service_provider }) : Promise.resolve(null),
    userId ? prisma.sentEmail.findFirst({ where: { user_id: userId, template: "verify-email" }, orderBy: { created_at: "desc" }, select: { created_at: true } }) : Promise.resolve(null),
    Promise.all([
      prisma.workRequest.count({ where: { buyer_person_id: person.id } }),
      prisma.proposal.count({ where: { provider_person_id: person.id } }),
      prisma.workOrder.count({ where: { status: { in: [...SIGNED] }, OR: [{ buyer_person_id: person.id }, { provider_person_id: person.id }] } }),
      prisma.providerPayout.count({ where: { provider_person_id: person.id, paid_at: { not: null } } }),
      co ? prisma.payment.count({ where: { p_account_id: co.p_account_id } }) : Promise.resolve(0),
      userId ? prisma.connection.count({ where: { status: "ACCEPTED", OR: [{ from_user_id: userId }, { to_user_id: userId }] } }) : Promise.resolve(0),
      userId ? prisma.learnEnrollment.count({ where: { user_id: userId } }) : Promise.resolve(0),
      userId ? prisma.certification.count({ where: { user_id: userId } }) : Promise.resolve(0),
    ]),
    prisma.adminAudit.findMany({ where: { target_id: { in: [userId, person.id].filter((x): x is string => !!x) } }, orderBy: { created_at: "desc" }, take: 15, select: { action: true, actor_email: true, detail: true, created_at: true } }),
    co ? prisma.payoutMethod.findMany({ where: { company_id: co.id }, select: { label: true, last4: true, holder_name: true } }) : Promise.resolve([]),
  ]);
  const [workRequests, proposals, signed, payouts, payments, connections, enrollments, credentials] = counts;
  const missing = input ? missingRequired(input) : null;
  const score = person.providerProfile?.completeness ?? null;
  const searchable = !!person.providerProfile && !person.providerProfile.paused_at && (score ?? 0) >= VISIBILITY_THRESHOLD;
  const cur = path?.current ?? 1; // index of the first step not done (steps.length = all done)
  const steps = path?.steps ?? [];
  const curKey = steps[cur]?.key ?? null;
  const nOf = (k: string) => String(steps.findIndex((s) => s.key === k) + 1);
  const status = path?.status ?? "Registered";
  // When the person reached their current status (best available date).
  const reachedAt =
    cur === 1 ? person.created_at
    : cur === 2 ? u?.email_verified ?? person.created_at
    : cur === 3 ? person.providerProfile?.onboarding_completed_at ?? person.requesterProfile?.completed_at ?? person.created_at
    : cur === 4 ? member?.decided_at ?? member?.created_at ?? person.created_at
    : person.created_at;
  const now = new Date().getTime();
  const stuck = Math.max(0, Math.floor((now - reachedAt.getTime()) / 86_400_000));
  const legal = (co?.legal_name ?? co?.name ?? "").trim();
  const same = (a: string | null) => !!a && a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === legal.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const roles = jobsFor(person).join(" · ") || "No role yet";
  const isTest = u?.is_test || /@(panameer\.com|example\.seed)$/i.test(u?.email ?? "");

  // Blocked by: the first unmet step and its fix.
  const blocked =
    curKey === "verify" ? { text: "email not verified", sub: verifySent ? `Verification email sent ${d(verifySent.created_at)}` : "No verification email on record", fix: userId ? <><ResendVerification userId={userId} /><MarkVerified personId={person.id} /></> : null }
    : curKey === "profile" ? { text: "profile checklist not complete", sub: missing?.length ? `Missing: ${missing.join(", ")}` : person.providerProfile ? `Score ${score} of 80` : "Buyer profile not finished", fix: person.providerProfile ? <NudgeToFinish personId={person.id} /> : null }
    : curKey === "link" ? { text: "not linked to a company", sub: pending.length ? `Asked to join ${pending.map((p) => p.company.name).join(", ")}` : "No company and no pending request", fix: <AddToCompany personId={person.id} /> }
    : curKey === "list" ? { text: "nothing for sale yet", sub: "No published service product and no proposal sent.", fix: null }
    : curKey === "validate" ? { text: "company not validated", sub: check ? `Missing: ${check.items.filter((i) => !i.done).map((i) => i.item).join(", ")}` : "", fix: co ? <Link href={`/admin/companies/${co.id}`} className="inline-flex min-h-[38px] items-center border border-ink px-3 text-[13px] font-bold">Open Company Legal &amp; Tax</Link> : null }
    : curKey === "contract" ? { text: "no signed work order yet", sub: "Two validated companies sign a work order.", fix: null }
    : curKey === "request" ? { text: "no payment request yet", sub: "A timesheet or milestone request on a signed work order.", fix: null }
    : curKey === "paid" ? { text: "not paid yet", sub: "Paid to a bank account in the company's legal name.", fix: null }
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl pb-14" data-admin-user={status}>
      <BackLink href="/admin/users" label="Users" />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold">
            {name}
            {isTest && <span className="ml-2 border border-ink-3 px-1.5 align-middle text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-2">Test</span>}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {u?.email ?? "No login"} · {roles} · joined {d(person.created_at)} · last login {d(u?.last_login)}
          </p>
        </div>
        <div className="text-right" data-status={status}>
          <span className="inline-block border-2 border-ink px-2 py-0.5 text-[13px] font-extrabold uppercase tracking-[0.08em]">{status}</span>
          <p className="mt-1 text-[12.5px] text-ink-2">{cur < steps.length ? `Step ${cur} of ${steps.length} · stuck ${stuck} day${stuck === 1 ? "" : "s"}` : "Every step done"}</p>
        </div>
      </div>

      <div className="mt-5"><LifecycleStrip steps={steps.length ? steps : undefined} current={cur - 1} intro="they" hereLabel="Here now" /></div>

      {blocked && (
        <div data-blocked className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-[#b26b00] p-4">
          <div className="min-w-0">
            <b className="block text-[15px]">Blocked by: {blocked.text}</b>
            {blocked.sub && <span className="text-[13px] text-ink-2">{blocked.sub}</span>}
          </div>
          {blocked.fix && <div className="flex flex-wrap items-center gap-2">{blocked.fix}</div>}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <Step n="1" title="Account" tag="DONE" tone="done">
          <Row label="Phone" value={person.phone || <No>Not added</No>} />
          <Row label="Terms accepted" value={u?.tos_accepted_at ? d(u.tos_accepted_at) : <No>Not recorded</No>} />
          <Row label="Account" value={u ? `${u.is_active ? "Active" : "Deactivated"} · ${u.locked ? "locked" : "not locked"}` : <No>No login on this record</No>} />
          {u ? (
            <UserEditPanel
              state={{
                personId: person.id, hasAccount: true, first: person.first_name ?? "", last: person.last_name ?? "", email: u.email ?? "",
                verified: Boolean(u.email_verified), locked: u.locked, active: u.is_active,
                buyer: person.is_service_buyer, provider: person.is_service_provider, coordinator: person.is_service_coordinator,
              }}
            />
          ) : (
            <p className="text-[13.5px] text-ink-2">This person has no sign-in account, so there is no email, password or lock to change.</p>
          )}
        </Step>

        <Step n="2" title="Verify Account" tag={u?.email_verified ? "DONE" : "WAITING"} tone={u?.email_verified ? "done" : "wait"} actions={!u?.email_verified && userId ? <><ResendVerification userId={userId} /><MarkVerified personId={person.id} /></> : undefined}>
          <Row label="Email verified" value={u?.email_verified ? d(u.email_verified) : <No>No{verifySent ? ` · link sent ${d(verifySent.created_at)}` : ""}</No>} />
        </Step>

        <Step
          n="3"
          title="Complete Profile"
          tag={person.providerProfile ? `${score} OF 80` : person.requesterProfile?.completed_at ? "DONE" : "WAITING"}
          tone={cur > 3 ? "done" : "wait"}
          actions={person.providerProfile ? <><Link href={`/providers/${person.providerProfile.id}`} className="inline-flex min-h-[38px] items-center border border-ink px-3 text-[13px] font-bold">View Public Profile</Link>{missing?.length ? <NudgeToFinish personId={person.id} /> : null}</> : undefined}
        >
          {person.providerProfile && missing ? (
            <>
              <ul data-checklist className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                {CHECK.map(([label, phrase]) => {
                  const ok = !missing.includes(phrase);
                  return (
                    <li key={label} className={ok ? "" : "text-[#b26b00]"}>
                      {ok ? "✓" : "✗"} {label}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[13px]">Searchable: <b>{searchable ? "Yes" : "No"}</b>{person.providerProfile.paused_at ? " · paused by the member" : ""}</p>
            </>
          ) : (
            <Row label="Buyer profile" value={person.requesterProfile?.completed_at ? `Finished ${d(person.requesterProfile.completed_at)}` : <No>Not finished</No>} />
          )}
        </Step>

        <Step n={nOf("link")} title="Add Company" tag={co ? "DONE" : "NOT YET"} tone={co ? "done" : "wait"} actions={<AddToCompany personId={person.id} />}>
          <Row label="Company" value={co ? <><Link href={`/admin/companies/${co.id}`} className="font-semibold text-magenta-ink underline">{co.name}</Link> · {member!.role === "ADMIN" ? "admin" : "member"}</> : <No>None</No>} />
          <Row label="Join requests" value={pending.length ? pending.map((p) => `${p.company.name} (asked ${d(p.created_at)})`).join(", ") : <No>None</No>} />
        </Step>

        <Step n={nOf("validate")} title="Validate Company" tag={!co ? "—" : check?.ready ? "VALIDATED" : "WAITING"} tone={!co ? "none" : check?.ready ? "done" : "wait"} actions={co ? <Link href={`/admin/companies/${co.id}`} className="inline-flex min-h-[38px] items-center border border-ink px-3 text-[13px] font-bold">Open Company Legal &amp; Tax</Link> : undefined}>
          {co ? (
            <>
              <Row label="Legal name" value={co.legal_name ?? <No>{co.name} (no separate legal name)</No>} />
              <Row label="Tax ID" value={co.tin ? `•••••${co.tin.replace(/\D/g, "").slice(-4)}` : <No>Not added</No>} />
              <Row label="Tax form" value={co.tax_form_uploaded_at ? `On file · ${d(co.tax_form_uploaded_at)}` : <No>Not uploaded (W-9 / W-8BEN-E)</No>} />
              <Row
                label="Payout account"
                value={coPayouts.length ? coPayouts.map((p) => `${p.label}${p.last4 ? ` ··${p.last4}` : ""} — holder ${p.holder_name ? (same(p.holder_name) ? "matches ✓" : `"${p.holder_name}" doesn't match`) : "not recorded"}`).join("; ") : <No>None — holder must match the legal name</No>}
              />
            </>
          ) : (
            <p className="text-[13.5px] text-ink-3">No company yet.</p>
          )}
        </Step>

        <Step n={`${nOf("contract")}–${nOf("paid")}`} title="Contracts & Payments" tag={payouts + payments > 0 ? "PAID" : signed > 0 ? "CONTRACTED" : "—"} tone={signed > 0 ? "done" : "none"}>
          <Row label="Work requests · proposals" value={`${workRequests} · ${proposals}`} />
          <Row label="Signed work orders" value={signed} />
          <Row label="Payouts · payments" value={`${payouts} · ${payments}`} />
        </Step>

        <section className="border-t border-line pt-4">
          <h2 className="text-[17px] font-bold">Activity</h2>
          <Row label="Connections" value={connections} />
          <Row label="Learn" value={`${enrollments} enrollments · ${credentials} credentials`} />
        </section>

        <section className="border-t border-line pt-4" data-admin-changes>
          <h2 className="text-[17px] font-bold">Admin Changes</h2>
          <p className="text-[12.5px] text-ink-3">Every fix above is logged here.</p>
          {audit.length ? (
            <ul className="mt-2">
              {audit.map((a, i) => {
                const reason = (a.detail as { reason?: string } | null)?.reason;
                return (
                  <li key={i} className="grid grid-cols-[150px_1fr] gap-3 border-b border-line/60 py-1.5 text-[13px]">
                    <span className="text-ink-2">{dt(a.created_at)}</span>
                    <span>
                      <b>{a.action}</b> · {a.actor_email ?? "System"}
                      {reason && <span className="text-ink-2"> · “{reason}”</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-ink-3">No admin changes yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
