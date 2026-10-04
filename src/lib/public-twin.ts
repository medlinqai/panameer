import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import type { Viewer } from "@/lib/access";

export const PUBLIC_TWIN = {
  "/shop": "/marketplace",
  "/learn": "/training",
} as const satisfies Record<string, string>;

export type TwinnedRoute = keyof typeof PUBLIC_TWIN;

export async function memberOrPublicTwin(route: TwinnedRoute): Promise<Viewer> {
  const viewer = await getSessionViewer();
  if (!viewer) redirect(PUBLIC_TWIN[route]);
  return viewer;
}
