import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { writeAudit } from "./audit";

export class TestAccountError extends Error {
  constructor(message: string, public code: "INVALID" | "CONFIG" | "CONFIRM") {
    super(message);
    this.name = "TestAccountError";
  }
}

export const TEST_SET = [
  { email: "test21@panameer.com", first: "Tess", last: "Requester", kind: "requester" },
  { email: "test22@panameer.com", first: "Theo", last: "Requester", kind: "requester" },
  { email: "test23@panameer.com", first: "Tara", last: "Buyer", kind: "buyer" },
  { email: "test24@panameer.com", first: "Tom", last: "Buyer", kind: "buyer" },
  { email: "test25@panameer.com", first: "Rita", last: "Recruiter", kind: "recruiter" },
  { email: "test26@panameer.com", first: "Pria", last: "Provider", kind: "provider" },
  { email: "test27@panameer.com", first: "Paul", last: "Provider", kind: "provider" },
  { email: "test28@panameer.com", first: "Pam", last: "Provider", kind: "provider" },
  { email: "test29@panameer.com", first: "Pete", last: "Provider", kind: "provider" },
] as const;

export function hideTestFromMembers(viewerIsTest: boolean): { is_test?: false } {
  return viewerIsTest ? {} : { is_test: false };
}

export async function viewerIsTest(viewer: Viewer | null): Promise<boolean> {
  if (!viewer) return false;
  const u = await prisma.user.findUnique({ where: { id: viewer.userId }, select: { is_test: true } });
  return u?.is_test === true;
}

/* ── create ─────────────────────────────────────────────────────────────── */

export type CreateResult = { created: string[]; skipped: string[] };

export async function createTestSet(viewer: Viewer): Promise<CreateResult> {
  const password = process.env.TEST_ACCOUNT_PASSWORD;
  if (!password || password.length < 10) {
    throw new TestAccountError(
      "Set TEST_ACCOUNT_PASSWORD (10+ characters) in the environment before creating test accounts.",
      "CONFIG",
    );
  }
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(password, 10);

  const emails = TEST_SET.map((t) => t.email);
  const existing = new Set(
    (await prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } })).map((u) =>
      u.email.toLowerCase(),
    ),
  );

  const created: string[] = [];
  const skipped: string[] = [];
  for (const t of TEST_SET) {
    if (existing.has(t.email.toLowerCase())) {
      skipped.push(t.email);
      continue;
    }
    await prisma.user.create({
      data: {
        email: t.email,
        password_hash: hash,
        first_name: t.first,
        last_name: t.last,
        email_verified: new Date(),
        is_test: true,
        is_active: true,
        tos_accepted_at: new Date(),
        tos_version: "test-set",
      },
    });
    created.push(t.email);
  }

  await writeAudit(viewer, {
    action: "test_set.create",
    targetTable: "users",
    detail: { created, skipped, set: "test21-test29" },
    rowCount: created.length,
  });
  return { created, skipped };
}

/* ── remove ─────────────────────────────────────────────────────────────── */

export type RemovablePreview = { id: string; email: string; createdAt: string }[];

export async function previewRemovable(): Promise<RemovablePreview> {
  const rows = await prisma.user.findMany({
    where: { is_test: true },
    select: { id: true, email: true, created_at: true },
    orderBy: { email: "asc" },
  });
  return rows.map((r) => ({ id: r.id, email: r.email, createdAt: r.created_at.toISOString() }));
}

export function expectedConfirmation(count: number): string {
  return `REMOVE ${count}`;
}

export async function removeTestAccounts(
  viewer: Viewer,
  confirmation: string,
): Promise<{ removed: number; emails: string[] }> {
  const removable = await previewRemovable();
  if (removable.length === 0) throw new TestAccountError("There are no test accounts to remove.", "INVALID");

  const expected = expectedConfirmation(removable.length);
  if (confirmation.trim() !== expected) {
    throw new TestAccountError(`Type ${expected} to confirm.`, "CONFIRM");
  }

  const ids = removable.map((r) => r.id);
  const emails = removable.map((r) => r.email);

  /**
   * ⚠⚠ THE AUDIT ROW IS WRITTEN BEFORE THE DELETE, and that order is the point:
   * if the delete fails the log says it was attempted, and if the log fails the
   * delete still happens — but the console carries it. A row written afterwards
   * would be lost exactly when the delete half-succeeded.
   */
  await writeAudit(viewer, {
    action: "test_accounts.remove",
    targetTable: "users",
    detail: { emails, confirmation: expected },
    rowCount: ids.length,
  });

  /**
   * ⚠⚠⚠ `deleteMany` WITH BOTH THE IDS **AND** `is_test: true`. The ids alone
   * would be enough; the flag is repeated so that **no single edit can turn this
   * into an unfiltered delete** — the gate mutates each half away and both must
   * fail it.
   */
  const { count } = await prisma.user.deleteMany({ where: { id: { in: ids }, is_test: true } });
  return { removed: count, emails };
}

/* ── the flag itself ────────────────────────────────────────────────────── */

/**
 * ⚠⚠⚠ **MARKING A REAL ACCOUNT AS TEST IS THE ONE WAY A REAL MEMBER COULD BE
 * SWEPT INTO THE REMOVE PATH**, so it needs the caller to say so explicitly.
 * The UI asks first; this refuses silently-destructive use by requiring the
 * acknowledgement rather than trusting the screen.
 */
export async function setTestFlag(
  viewer: Viewer,
  userId: string,
  isTest: boolean,
  acknowledgedRealAccount = false,
): Promise<void> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, is_test: true },
  });
  if (!before) throw new TestAccountError("That account is gone.", "INVALID");
  if (before.is_test === isTest) return;

  if (isTest && !acknowledgedRealAccount) {
    throw new TestAccountError(
      `${before.email} is a real account. Marking it TEST puts it in the remove path — confirm first.`,
      "CONFIRM",
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { is_test: isTest } });
  await writeAudit(viewer, {
    action: "user.set_test",
    targetTable: "users",
    targetId: userId,
    detail: { field: "is_test", before: before.is_test, after: isTest, email: before.email },
  });
}
