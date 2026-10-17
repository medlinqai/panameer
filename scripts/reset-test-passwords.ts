// Scott 10-17: every test login uses Panameer123 — reset test38–test60 (the marketplace test set) to it.
// Run: npx tsx --env-file=.env.local scripts/reset-test-passwords.ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const hash = await bcrypt.hash("Panameer123", 10);
  const emails = Array.from({ length: 23 }, (_, i) => `test${38 + i}@panameer.com`);
  const r = await prisma.user.updateMany({ where: { email: { in: emails } }, data: { password_hash: hash } });
  console.log(`Reset ${r.count} test logins to Panameer123.`);
}
main().finally(() => prisma.$disconnect());
