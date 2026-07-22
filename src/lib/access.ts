/**
 * Access control — the Viewer pattern (carried from Medlinq).
 *
 * Every access-checked query helper takes a `viewer` as its FIRST argument,
 * even when currently unused, so access decisions are centralized here and
 * never inlined into components. Grow `deriveAccessFlags` and the `can*`
 * helpers as roles are defined in `claude/architecture.md`.
 */

export type Role = "ADMIN" | "MEMBER";

export type AccessFlags = {
  isSystemAdmin: boolean;
  isAdmin: boolean;
};

/** Derive access flags ONCE from the persisted role set, so `isAdmin` can't drift. */
export function deriveAccessFlags(input: {
  role: string;
  isSystemAdmin: boolean;
}): AccessFlags {
  const isAdmin = input.isSystemAdmin || input.role === "ADMIN";
  return { isSystemAdmin: input.isSystemAdmin, isAdmin };
}

/** The identity + capabilities passed as the first arg to access-checked helpers. */
export type Viewer = {
  userId: string;
  role: string;
  isSystemAdmin: boolean;
  isAdmin: boolean;
};

/** Build a Viewer from a NextAuth session (or null if unauthenticated). */
export function viewerFromSession(
  session:
    | {
        user?: {
          id?: string;
          role?: string;
          isSystemAdmin?: boolean;
          isAdmin?: boolean;
        };
      }
    | null
    | undefined
): Viewer | null {
  const u = session?.user;
  if (!u?.id) return null;
  return {
    userId: u.id,
    role: u.role ?? "MEMBER",
    isSystemAdmin: u.isSystemAdmin ?? false,
    isAdmin: u.isAdmin ?? false,
  };
}
