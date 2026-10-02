import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { getSessionViewer } from "@/lib/session";

/**
 * Authenticated app shell — the MEDLINQ-STYLE CASING (MASTER WS9).
 *
 * The light SideRail is replaced by AppShell: dark rail + header + footer, one
 * chrome for every authenticated page. The switch from the public top nav still
 * happens at login; MeProvider still loads /api/me for the rail and header.
 *
 * ── ⚠⚠⚠ IT IS THE APP SHELL, SO IT ONLY WRAPS AN APP VISITOR (`P2-A1.1-E770`) ─
 *
 * ⚠ **SCOTT, 2026-10-02, from a signed-out screenshot:** the masked preview
 * renders *"the app's dark band above the marketing header"*, the marketing
 * header sitting inside a card. ⚠⚠ **MEASURED: the dark band at y=44 (67px tall)
 * and the marketing header at y=135 — two headers, on a page a stranger reaches
 * first.**
 *
 * ⚠⚠⚠ **THE CAUSE WAS HERE, NOT ON THE PAGE.** This layout rendered `AppShell`
 * unconditionally while knowing nothing about the viewer, and
 * `MaskedProviderPage` correctly brings its own `MarketingHeader` and
 * `MarketingFooter` — it is a public page and must look like one.
 *
 * ⚠⚠ **WHY THIS IS SAFE TO DO IN THE LAYOUT RATHER THAN THE PAGE:**
 * `/providers/[id]` is the **ONLY** public route under `(app)` — checked against
 * all 48 entries in `lib/public-routes.ts`. Every other route here sends a
 * signed-out visitor to `/login` before a layout ever renders, so this branch
 * has exactly one reachable page today.
 *
 * ⚠⚠⚠ **IT IS NOT AN ACCESS DECISION AND MUST NEVER BECOME ONE.** The gate is
 * still `proxy.ts` plus `route-access.ts`; this only chooses CHROME. A signed-out
 * visitor reaching a page under here without an allowlist entry is a routing bug
 * that this must not paper over — which is why it branches on the session rather
 * than on the path.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getSessionViewer();
  /* ⚠ No `MeProvider` either: it exists to feed the rail and header `/api/me`,
     and signed out there is no rail, no header and no `me`. */
  if (!viewer) return <>{children}</>;
  return (
    <MeProvider>
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
