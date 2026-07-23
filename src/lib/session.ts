import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { viewerFromSession, type Viewer } from "@/lib/access";

/**
 * Resolve the current request's Viewer from the NextAuth session, or null if
 * unauthenticated. Web route handlers and (later) the mobile token path both
 * funnel through here, so business logic never reads the session directly.
 *
 * The returned Viewer's `pAccountId` is null — the org fence is resolved from
 * the linked Person by the lib function that needs it (see `getMe`), keeping
 * auth lean.
 */
export async function getSessionViewer(): Promise<Viewer | null> {
  const session = await getServerSession(authOptions);
  return viewerFromSession(session);
}
