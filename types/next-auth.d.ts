import type { DefaultSession } from "next-auth";

// Augment NextAuth types with Panameer's custom session/user/JWT fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isSystemAdmin: boolean;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isSystemAdmin: boolean;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isSystemAdmin?: boolean;
    isAdmin?: boolean;
  }
}
