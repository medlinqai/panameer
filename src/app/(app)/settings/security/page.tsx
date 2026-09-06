import { guardPage } from "@/lib/guard";
import { getSecurity } from "@/lib/security-settings";
import { SecurityPanel } from "@/components/settings/SecurityPanel";

/**
 * PASSWORD & SECURITY (J2.4 WS-H / E018).
 *
 * Password change · Google and Apple connect · two-step verification.
 *
 * LINKEDIN IS ABSENT AND THAT IS CORRECT — it was removed from the product
 * everywhere in PJv2 WS2, and a disconnected row for a provider we will never
 * offer reads as a promise rather than a status.
 *
 * TWO-STEP IS REAL TOTP. Mobile-push 2FA is deferred with the mobile app that
 * would receive it; what ships is an authenticator secret verified server-side
 * against RFC 6238, plus a security question whose answer is hashed like the
 * credential it is. Half-built 2FA is worse than none — it persuades somebody
 * they are protected when they are not — so this is genuine or it is absent.
 */
export const metadata = { title: "Password & Security · Panameer" };

export default async function SecurityPage() {
  /* ⚠ `authenticated` (`P2-J1.1-E046`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. One of three layers; see
     `settings/layout.tsx` and `route-access.ts`. Scott opened the tree whole. */
  const viewer = await guardPage("authenticated");
  const security = await getSecurity(viewer);
  return <SecurityPanel security={security} />;
}
