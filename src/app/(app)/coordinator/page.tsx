import { guardPage } from "@/lib/guard";
import { CoordinatorConsole } from "@/components/coordinator/CoordinatorConsole";

/**
 * Minimal Service Coordinator surface (brief_I): an "Invite a Provider" action
 * + a "My Providers" roster. AUTHORITATIVE server gate via guardPage
 * (canCoordinate, brief_J) — non-coordinators are redirected. This is NOT the
 * full coordinator app/nav; just enough to launch invites and see results.
 */
export default async function CoordinatorPage() {
  await guardPage("canCoordinate");

  return (
    /*
      NO BESPOKE CHROME (brief_nav_casing_consistency WS-B). This page used to
      render its own `min-h-screen` wrapper, a Logo header and a "← Back to
      Dashboard" link — a one-off menu, which is exactly what WS-B exists to
      delete. It now sits inside the route group, so `AppShell` supplies the
      rail, header and footer, and the back-link is unnecessary because the rail
      is right there.

      SHELL + MENU: casing with PROVIDER_NAV (Scott's call). A coordinator is a
      seller-side role — they represent providers — so the seller menu is the
      one that matches what they came to do.
    */
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-[26px] font-extrabold tracking-[-0.5px]">
        Coordinator
      </h1>
      <p className="mb-6 text-ink-2">Build your team of service providers.</p>
      <CoordinatorConsole />
    </div>
  );
}
