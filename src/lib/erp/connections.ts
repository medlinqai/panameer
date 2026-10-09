import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { ErpDirection, ErpMessageStatus, ErpMessageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// X-E001: ERP connections + the message log. Inbound secrets are stored as scrypt hashes; outbound credentials live in env vars only.
export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored || !secret) return false;
  const [kind, salt, hex] = stored.split(":");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const want = Buffer.from(hex, "hex");
  const got = scryptSync(secret, salt, want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** True only when Scott has switched outbound ERP traffic on (Vercel env). */
export function erpSendEnabled(): boolean {
  return process.env.ERP_SEND_ENABLED?.trim() === "1";
}

export type ConnectionInput = {
  pAccountId: string;
  name: string;
  fromIdentity: string;
  senderIdentity: string;
  toIdentity?: string | null;
  fromDomain?: string | null;
  senderDomain?: string | null;
  outboundCxmlUrl?: string | null;
  oracleRestBaseUrl?: string | null;
  credentialEnvName?: string | null;
  active?: boolean;
  /** Only when setting or rotating the inbound shared secret. */
  newSecret?: string | null;
};

const clean = (v?: string | null) => (v ?? "").trim() || null;

export async function saveConnection(id: string | null, input: ConnectionInput) {
  const env = clean(input.credentialEnvName);
  if (env && !/^[A-Z][A-Z0-9_]{2,63}$/.test(env)) throw new Error("The credential env var name must look like ORACLE_ACME_REST (capitals, digits, underscores).");
  const data = {
    p_account_id: input.pAccountId,
    name: input.name.trim(),
    from_identity: input.fromIdentity.trim(),
    sender_identity: input.senderIdentity.trim(),
    to_identity: clean(input.toIdentity) ?? "PANAMEER",
    from_domain: clean(input.fromDomain) ?? "NetworkID",
    sender_domain: clean(input.senderDomain) ?? "NetworkID",
    outbound_cxml_url: clean(input.outboundCxmlUrl),
    oracle_rest_base_url: clean(input.oracleRestBaseUrl),
    credential_env_name: env,
    active: input.active ?? true,
    ...(clean(input.newSecret) ? { shared_secret_hash: hashSecret(input.newSecret!.trim()) } : {}),
  };
  if (!data.name || !data.from_identity || !data.sender_identity) throw new Error("Name, From identity and Sender identity are required.");
  return id ? prisma.erpConnection.update({ where: { id }, data, select: { id: true } }) : prisma.erpConnection.create({ data, select: { id: true } });
}

export async function listConnections() {
  const rows = await prisma.erpConnection.findMany({ orderBy: { created_at: "asc" } });
  const accts = new Map((await prisma.pAccount.findMany({ where: { id: { in: rows.map((r) => r.p_account_id) } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id, pAccountId: r.p_account_id, accountName: accts.get(r.p_account_id) ?? "—", name: r.name, erpKind: r.erp_kind,
    fromDomain: r.from_domain, fromIdentity: r.from_identity, toIdentity: r.to_identity, senderDomain: r.sender_domain, senderIdentity: r.sender_identity,
    hasSecret: !!r.shared_secret_hash, outboundCxmlUrl: r.outbound_cxml_url, oracleRestBaseUrl: r.oracle_rest_base_url,
    credentialEnvName: r.credential_env_name, credentialSet: !!(r.credential_env_name && process.env[r.credential_env_name]), active: r.active,
  }));
}
export type ConnectionRow = Awaited<ReturnType<typeof listConnections>>[number];

/** Records a message. Inbound callers check `duplicate` first (idempotency on payloadID). */
export async function logMessage(m: {
  connectionId: string; direction: ErpDirection; type: ErpMessageType; payloadId: string; status: ErpMessageStatus; body: string;
  workRequestId?: string | null; workOrderId?: string | null; settlementRequestId?: string | null; response?: string | null;
}) {
  return prisma.erpMessage.create({
    data: {
      connection_id: m.connectionId, direction: m.direction, type: m.type, payload_id: m.payloadId, status: m.status, body: m.body, response: m.response ?? null,
      work_request_id: m.workRequestId ?? null, work_order_id: m.workOrderId ?? null, settlement_request_id: m.settlementRequestId ?? null,
    },
    select: { id: true },
  });
}

export async function findMessage(connectionId: string, payloadId: string) {
  return prisma.erpMessage.findUnique({ where: { connection_id_payload_id: { connection_id: connectionId, payload_id: payloadId } } });
}
