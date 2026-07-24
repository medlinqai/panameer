import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { setIdBadge } from "@/lib/profile-settings";
import { OnboardingError } from "@/lib/onboarding";

const schema = z.object({ idBadge: z.string().max(200).nullable() });

/** POST /api/settings/id-badge — set the owner's ProviderProfile.id_badge. */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await setIdBadge(viewer, parsed.data.idBadge));
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] id-badge failed:", e);
    return NextResponse.json({ error: "Could not save ID badge" }, { status: 500 });
  }
}
