import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { publishProfile, OnboardingError } from "@/lib/onboarding";
import { publishCatalog } from "@/lib/build-catalog";
import { publishGate as gateFor } from "@/lib/my-catalog";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

async function publishGate(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  return p ? gateFor(p.id) : { ok: false, reason: "No seller profile" };
}

export async function POST() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    // SO-E004 Go Live: the profile and the catalog go live together; publishing needs a linked company (a pending joiner is told why).
    const gate = await publishGate(viewer);
    if (!gate.ok) return NextResponse.json({ error: gate.reason ?? "Add your company to go live.", code: "GATE" }, { status: 400 });
    const out = await publishProfile(viewer);
    const rates = await publishCatalog(viewer).catch(() => 0);
    return NextResponse.json({ ...out, ratesPublished: rates });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status =
        e.code === "NOT_VERIFIED" ? 403 : e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] publish failed:", e);
    return NextResponse.json({ error: "Could not publish" }, { status: 500 });
  }
}
