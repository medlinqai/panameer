import bcrypt from "bcryptjs";

/**
 * Centralized password hashing (bcrypt) — the same algorithm + cost the seed
 * and NextAuth credentials compare against (src/lib/auth.ts).
 */
const BCRYPT_COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
