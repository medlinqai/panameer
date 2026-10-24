import { prisma } from "@/lib/prisma";
import { extrinsic, first, text } from "@/lib/erp/cxml";
import { hashSecret } from "@/lib/erp/connections";

// EO-E002/E003: the first punch-in from an unknown ERP sets the customer up — trust on first use + email confirmation.
// The connection (secret hashed and locked to that identity), the customer account + Company and the first requester
// (company admin) are created at once; it shops straight away (SELF_PENDING) and nothing waits for Panameer's approval.
const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "zoho.com", "yandex.com", "mail.com"]);
const RATE_LIMIT = 5;

type Cred = { domain: string; identity: string; secret: string };

/** "lopez-mfg.com" → "Lopez Mfg". */
export function companyFromDomain(domain: string): string {
  const label = domain.toLowerCase().replace(/^www\./, "").split(".")[0] ?? domain;
  return label.split(/[-_]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || domain;
}

/** 5 per hour per IP and per identity, for identities Panameer has never seen. */
export async function overSelfOnboardLimit(ip: string, identity: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000);
  const [byIp, byId] = await Promise.all([
    prisma.erpPunchinAttempt.count({ where: { ip, created_at: { gte: since } } }),
    prisma.erpPunchinAttempt.count({ where: { identity, created_at: { gte: since } } }),
  ]);
  await prisma.erpPunchinAttempt.create({ data: { ip, identity } });
  return byIp >= RATE_LIMIT || byId >= RATE_LIMIT;
}

/** Oracle sends the requester's name as "Last, First". */
function splitName(name: string) {
  return name.includes(",") ? [name.split(",").slice(1).join(",").trim(), name.split(",")[0].trim()] : [name.split(/\s+/)[0] ?? "", name.split(/\s+/).slice(1).join(" ")];
}

export async function selfOnboard(h: { from: Cred; to: Cred; sender: Cred }, req: Element | null) {
  const userId = extrinsic(req, "UserId") || extrinsic(req, "UniqueName");
  const email = (extrinsic(req, "UserEmail") || text(first(first(req, "Contact"), "Email"))).trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] : "";
  const freeMail = FREE_MAIL.has(domain);
  const named = (extrinsic(req, "CompanyName") || extrinsic(req, "OrganizationName") || "").trim();
  const companyName = (named || (domain && !freeMail ? companyFromDomain(domain) : "") || h.from.identity).slice(0, 120);
  const fullName = text(first(first(req, "Contact"), "Name")) || [extrinsic(req, "FirstName"), extrinsic(req, "LastName")].filter(Boolean).join(" ") || email || userId || "ERP Requester";
  const [firstName, lastName] = splitName(fullName);
  const flag = !email ? "Email Missing" : freeMail ? "Check Company" : null;
  const emailTaken = email ? !!(await prisma.user.findUnique({ where: { email }, select: { id: true } })) : false;

  return prisma.$transaction(async (tx) => {
    const acct = await tx.pAccount.create({ data: { kind: "BUYER", name: companyName, status: "ACTIVE" } });
    const company = await tx.company.create({ data: { p_account_id: acct.id, name: companyName, email_domain: domain && !freeMail ? domain : null } });
    // A User only when the email is free to use — the confirm link sets their password.
    const user = email && !emailTaken ? await tx.user.create({ data: { email, first_name: (firstName || fullName).slice(0, 100), last_name: lastName.slice(0, 100), role: "MEMBER" } }) : null;
    const person = await tx.person.create({ data: { company_id: company.id, user_id: user?.id ?? null, first_name: (firstName || fullName).slice(0, 100), last_name: lastName.slice(0, 100) || "—", status: "ACTIVE", is_service_buyer: true } });
    await tx.requesterProfile.create({ data: { person_id: person.id, employee_id: userId || null, buyer_email: email || null, buyer_name: fullName.slice(0, 200) } });
    await tx.companyMembership.create({ data: { person_id: person.id, company_id: company.id, role: "ADMIN", status: "APPROVED", decided_at: new Date(), auto_approved: true, matched_on: "ERP_FIRST_PUNCHIN" } });
    const conn = await tx.erpConnection.create({
      data: {
        p_account_id: acct.id, name: companyName,
        from_domain: h.from.domain || "NetworkID", from_identity: h.from.identity,
        to_domain: h.to.domain || "NetworkID", to_identity: h.to.identity || "PANAMEER",
        sender_domain: h.sender.domain || "NetworkID", sender_identity: h.sender.identity,
        shared_secret_hash: hashSecret(h.sender.secret),
        created_via: "SELF", status: "SELF_PENDING", first_contact_email: email || null, first_requester_person_id: person.id,
        flag: emailTaken ? "Email Already Registered" : flag,
      },
    });
    return { conn, personId: person.id, companyName, email, hasUser: !!user };
  });
}
