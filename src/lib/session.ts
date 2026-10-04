import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { viewerFromSession, type Viewer } from "@/lib/access";

export async function getSessionViewer(): Promise<Viewer | null> {
  const session = await getServerSession(authOptions);
  return viewerFromSession(session);
}
