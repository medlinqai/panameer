import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { attr, extrinsic, first, headerCredentials, parseCxml, statusResponse, text, esc } from "@/lib/erp/cxml";
import { findMessage, logMessage, verifySecret } from "@/lib/erp/connections";

// X-E002: PunchOutSetupRequest → requester resolved, session stored, one-time StartPage URL returned.
export const PUNCHOUT_COOKIE = "pm_punchout";
const SESSION_HOURS = 4;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Finds the connection by From + Sender identity and checks the shared secret. */
export async function authenticate(doc: Document) {
  const h = headerCredentials(doc);
  // ES-E001: only real ERP connections authenticate orders and shopping — never the setup credential.
  const c = await prisma.erpConnection.findFirst({ where: { kind: "ERP", active: true, status: { not: "SUSPENDED" }, sender_identity: h.sender.identity, from_identity: h.from.identity } });
  if (!c || !verifySecret(h.sender.secret, c.shared_secret_hash)) return null;
  return c;
}

async function resolveRequester(pAccountId: string, req: Element | null) {
  const userId = extrinsic(req, "UserId") || extrinsic(req, "UniqueName");
  const email = (extrinsic(req, "UserEmail") || text(first(first(req, "Contact"), "Email"))).toLowerCase();
  const inAccount = { company: { p_account_id: pAccountId } };
  if (userId) {
    const rp = await prisma.requesterProfile.findFirst({ where: { employee_id: userId, person: inAccount }, select: { person_id: true } });
    if (rp) return rp.person_id;
  }
  if (email) {
    const p = await prisma.person.findFirst({ where: { ...inAccount, user: { email: { equals: email, mode: "insensitive" } } }, select: { id: true } });
    if (p) return p.id;
  }
  // Unknown requester: created pending under the customer's company (no sign-in; they only ever punch in).
  const co = await prisma.company.findFirst({ where: { p_account_id: pAccountId }, orderBy: { created_at: "asc" }, select: { id: true } });
  if (!co) throw new Error("This connection's customer account has no company");
  const name = text(first(first(req, "Contact"), "Name")) || [extrinsic(req, "FirstName"), extrinsic(req, "LastName")].filter(Boolean).join(" ") || email || userId || "ERP requester";
  // Oracle sends "Last, First" — read it the right way round.
  const [firstName, lastName] = name.includes(",") ? [name.split(",").slice(1).join(",").trim(), name.split(",")[0].trim()] : [name.split(/\s+/)[0], name.split(/\s+/).slice(1).join(" ")];
  const p = await prisma.person.create({ data: { company_id: co.id, first_name: (firstName || name).slice(0, 100), last_name: lastName.slice(0, 100) || "—" }, select: { id: true } });
  await prisma.requesterProfile.create({ data: { person_id: p.id, employee_id: userId || null, buyer_email: email || null, buyer_name: name.slice(0, 200) } });
  // EO-E006: later requesters join the company as members (the first one, from self-onboarding, is its admin).
  await prisma.companyMembership.create({ data: { person_id: p.id, company_id: co.id, role: "MEMBER", status: "APPROVED", decided_at: new Date(), auto_approved: true, matched_on: "ERP_PUNCHIN" } }).catch(() => null);
  return p.id;
}

/** Handles one PunchOutSetupRequest. Returns the cXML reply and HTTP status. */
export async function handlePosr(xml: string, origin: string, ip = "unknown"): Promise<{ status: number; body: string }> {
  let doc: Document;
  try {
    doc = parseCxml(xml);
  } catch {
    return { status: 400, body: statusResponse(400, "Bad Request") };
  }
  const pid = attr(doc.documentElement, "payloadID") || `posr-${Date.now()}`;
  const req = first(doc, "PunchOutSetupRequest");
  const formPost = text(first(first(req, "BrowserFormPost"), "URL"));
  const buyerCookie = text(first(req, "BuyerCookie"));
  if (!req || !formPost || !buyerCookie) return { status: 400, body: statusResponse(400, "Missing BrowserFormPost or BuyerCookie") };
  // EO-E002/E003: a known identity must bring its locked secret; an unknown one onboards itself (rate-limited).
  const h = headerCredentials(doc);
  if (!h.from.identity || !h.sender.identity || !h.sender.secret) return { status: 401, body: statusResponse(401, "Unauthorized") };
  // ES-E001: the public setup credential opens a setup session only (rate-limited); StartPage → Set Up Panameer.
  const { SETUP_IDENTITY, ensureSetupConnection } = await import("@/lib/erp/setup");
  if (h.from.identity === SETUP_IDENTITY || h.sender.identity === SETUP_IDENTITY) {
    const { overSelfOnboardLimit } = await import("@/lib/erp/self-onboard");
    if (await overSelfOnboardLimit(ip, SETUP_IDENTITY)) return { status: 429, body: statusResponse(429, "Too Many Requests") };
    const setup = await ensureSetupConnection();
    if (!setup || !verifySecret(h.sender.secret, setup.shared_secret_hash)) return { status: 401, body: statusResponse(401, "Unauthorized") };
    const userId = extrinsic(req, "UserId") || extrinsic(req, "UniqueName");
    const email = (extrinsic(req, "UserEmail") || text(first(first(req, "Contact"), "Email"))).trim().toLowerCase();
    const name = text(first(first(req, "Contact"), "Name")) || [extrinsic(req, "FirstName"), extrinsic(req, "LastName")].filter(Boolean).join(" ");
    const token = randomBytes(32).toString("base64url");
    await prisma.punchoutSession.create({ data: { connection_id: setup.id, start_token_hash: sha(token), requester_person_id: null, setup_data: { name, email, employeeId: userId, companyName: extrinsic(req, "CompanyName") || extrinsic(req, "OrganizationName") || "" }, buyer_cookie: buyerCookie, browser_form_post_url: formPost, operation: "create", expires_at: new Date(Date.now() + SESSION_HOURS * 3_600_000) } });
    await logMessage({ connectionId: setup.id, direction: "IN", type: "POSR", payloadId: pid, status: "PROCESSED", body: xml }).catch(() => null);
    return { status: 200, body: statusResponse(200, "success", `<PunchOutSetupResponse><StartPage><URL>${esc(`${origin}/punchout/start?t=${token}`)}</URL></StartPage></PunchOutSetupResponse>`) };
  }
  const known = await prisma.erpConnection.findFirst({ where: { kind: "ERP", OR: [{ sender_identity: h.sender.identity, from_identity: h.from.identity }, { from_identity: h.from.identity }] }, orderBy: { created_at: "asc" } });
  let conn: Awaited<ReturnType<typeof authenticate>>;
  if (known) {
    if (!verifySecret(h.sender.secret, known.shared_secret_hash)) return { status: 401, body: statusResponse(401, "Unauthorized") };
    if (!known.active || known.status === "SUSPENDED") return { status: 200, body: statusResponse(200, "success", `<PunchOutSetupResponse><StartPage><URL>${esc(`${origin}/punchout/paused`)}</URL></StartPage></PunchOutSetupResponse>`) };
    conn = known;
  } else {
    // ES-E002: unknown identities are refused — new customers start with the public setup credential (/erp/connect).
    return { status: 401, body: statusResponse(401, "Unauthorized") };
  }
  if (!conn) return { status: 401, body: statusResponse(401, "Unauthorized") };

  const seen = await findMessage(conn.id, pid);
  if (seen) await prisma.punchoutSession.updateMany({ where: { connection_id: conn.id, buyer_cookie: buyerCookie, started_at: null }, data: { expires_at: new Date() } });

  const requester = await resolveRequester(conn.p_account_id, req);
  const token = randomBytes(32).toString("base64url");
  await prisma.punchoutSession.create({
    data: { connection_id: conn.id, start_token_hash: sha(token), requester_person_id: requester, buyer_cookie: buyerCookie, browser_form_post_url: formPost, operation: attr(req, "operation") || "create", expires_at: new Date(Date.now() + SESSION_HOURS * 3_600_000) },
  });
  if (!seen) await logMessage({ connectionId: conn.id, direction: "IN", type: "POSR", payloadId: pid, status: "PROCESSED", body: xml });
  const start = `${origin}/punchout/start?t=${token}`;
  return { status: 200, body: statusResponse(200, "success", `<PunchOutSetupResponse><StartPage><URL>${esc(start)}</URL></StartPage></PunchOutSetupResponse>`) };
}

/** /punchout/start: trades the one-time token for the session cookie. */
export async function startSession(token: string): Promise<string | null> {
  const s = await prisma.punchoutSession.findUnique({ where: { start_token_hash: sha(token) } });
  if (!s || s.started_at || s.returned_at || s.expires_at < new Date()) return null;
  const cookie = randomBytes(32).toString("base64url");
  const done = await prisma.punchoutSession.updateMany({ where: { id: s.id, started_at: null }, data: { started_at: new Date(), cookie_hash: sha(cookie) } });
  return done.count === 1 ? cookie : null;
}

/** The live punchout session for a cookie value, or null (expired, returned or unknown). */
export async function sessionFor(cookie: string | undefined | null) {
  if (!cookie) return null;
  const s = await prisma.punchoutSession.findUnique({ where: { cookie_hash: sha(cookie) } });
  if (!s || s.returned_at || s.expires_at < new Date()) return null;
  const conn = await prisma.erpConnection.findUnique({ where: { id: s.connection_id } });
  if (!conn?.active || conn.status === "SUSPENDED") return null;
  return { ...s, connection: conn };
}
export type PunchoutSessionLive = NonNullable<Awaited<ReturnType<typeof sessionFor>>>;
