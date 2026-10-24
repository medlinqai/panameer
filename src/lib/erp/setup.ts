import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/erp/connections";

// ES-E001: the one public setup credential. A punch-in with it opens a setup session only — it can never shop, return a
// cart or place an order. Its secret is public by design (shown on /erp/connect); env ERP_SETUP_SECRET seeds it, Rotate replaces it.
export const SETUP_IDENTITY = "PANAMEER-SETUP";
const KEY = "erp_setup_secret";

export async function setupSecret(): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  const v = typeof row?.value === "string" ? row.value : null;
  return v || process.env.ERP_SETUP_SECRET || null;
}

/** The SETUP connection row, created (or its hash brought in line with the current secret) on first use. */
export async function ensureSetupConnection() {
  const secret = await setupSecret();
  if (!secret) return null;
  const existing = await prisma.erpConnection.findFirst({ where: { kind: "SETUP" } });
  if (existing) {
    if (!verifySecret(secret, existing.shared_secret_hash)) return prisma.erpConnection.update({ where: { id: existing.id }, data: { shared_secret_hash: hashSecret(secret) } });
    return existing;
  }
  const acct = (await prisma.pAccount.findFirst({ where: { name: "Panameer", kind: "BOTH" }, select: { id: true } })) ?? (await prisma.pAccount.create({ data: { kind: "BOTH", name: "Panameer" }, select: { id: true } }));
  return prisma.erpConnection.create({
    data: { p_account_id: acct.id, name: "Setup Credential", kind: "SETUP", from_identity: SETUP_IDENTITY, sender_identity: SETUP_IDENTITY, to_identity: "PANAMEER", shared_secret_hash: hashSecret(secret), created_via: "ADMIN", status: "ACTIVE" },
  });
}

/** Admin › ERP › Rotate: a new public setup secret (the /erp/connect page shows it at once). */
export async function rotateSetupSecret(userId: string | null): Promise<string> {
  const secret = randomBytes(18).toString("base64url");
  await prisma.platformSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: secret, updated_by: userId }, update: { value: secret, updated_by: userId } });
  await ensureSetupConnection();
  return secret;
}

/** The guard every shop / cart / return route uses. */
export const isSetupSession = (s: { connection: { kind: string } } | null | undefined) => s?.connection.kind === "SETUP";
export const SETUP_ONLY = "Setup only — finish setup to shop.";
