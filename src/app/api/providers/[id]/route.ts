import { NextResponse } from "next/server";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getSessionViewer } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewer = await getSessionViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Sign in to view a profile." }, { status: 401 });
  }

  const profile = await getProviderProfileView(id, {
    viewerUserId: viewer.userId,
    viewer,
  });
  if (!profile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
