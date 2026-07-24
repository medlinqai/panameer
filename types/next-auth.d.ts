import type { DefaultSession } from "next-auth";

// Augment NextAuth types with Panameer's custom session/user/JWT fields.
// The four actor flags ride in the token + session so both the edge proxy
// (token-only) and server components can read them with no extra DB hit
// (brief_J). Tenancy `pAccountId` deliberately stays OUT of the JWT.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isSystemAdmin: boolean;
      isAdmin: boolean;
      isServiceBuyer: boolean;
      isServiceProvider: boolean;
      isServiceCoordinator: boolean;
      isSupport: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isSystemAdmin: boolean;
    isAdmin: boolean;
    isServiceBuyer: boolean;
    isServiceProvider: boolean;
    isServiceCoordinator: boolean;
    isSupport: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isSystemAdmin?: boolean;
    isAdmin?: boolean;
    isServiceBuyer?: boolean;
    isServiceProvider?: boolean;
    isServiceCoordinator?: boolean;
    isSupport?: boolean;
  }
}
