import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  listOwnPackages,
  createPackage,
  updatePackage,
  deletePackage,
  setPackageStatus,
  listCapabilityDomains,
} from "@/lib/packages";
import { OnboardingError } from "@/lib/onboarding";

/**
 * The provider's own package catalog (brief_V / E045).
 *
 *   GET                                        → all of the viewer's packages
 *   POST { action: "create", package }
 *        { action: "update", packageId, package }
 *        { action: "delete", packageId }
 *        { action: "setStatus", packageId, status: "DRAFT" | "PUBLISHED" }
 *
 * OWNER-SCOPED: the lib resolves the profile from the session and ANDs every
 * client-supplied id with it, so a foreign id resolves to nothing.
 */
export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    /* the taxonomy rides along — see `listCapabilityDomains` for why it is not its own route */
    const [packages, capabilityDomains] = await Promise.all([
      listOwnPackages(gate),
      listCapabilityDomains(),
    ]);
    return NextResponse.json({ packages, capabilityDomains });
  } catch (e) {
    return handle(e, "Could not load packages");
  }
}

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const body = await request.json().catch(() => null);

  try {
    switch (body?.action) {
      case "create":
        await createPackage(viewer, body.package ?? {});
        break;
      case "update":
        await updatePackage(viewer, String(body.packageId), body.package ?? {});
        break;
      case "delete":
        await deletePackage(viewer, String(body.packageId));
        break;
      case "setStatus": {
        const status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
        await setPackageStatus(viewer, String(body.packageId), status);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      packages: await listOwnPackages(viewer),
      capabilityDomains: await listCapabilityDomains(),
    });
  } catch (e) {
    return handle(e, "Could not save the package");
  }
}

function handle(e: unknown, fallback: string) {
  if (e instanceof OnboardingError) {
    const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  console.error("[packages]", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
