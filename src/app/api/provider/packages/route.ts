import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  listOwnServiceProducts,
  createServiceProduct,
  updateServiceProduct,
  deleteServiceProduct,
  setServiceProductStatus,
  listCapabilityDomains,
} from "@/lib/service-products";
import { OnboardingError } from "@/lib/onboarding";

export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    /* the taxonomy rides along — see `listCapabilityDomains` for why it is not its own route */
    const [packages, capabilityDomains] = await Promise.all([
      listOwnServiceProducts(gate),
      listCapabilityDomains(),
    ]);
    return NextResponse.json({ packages, capabilityDomains });
  } catch (e) {
    return handle(e, "Could not load service products");
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
        await createServiceProduct(viewer, body.package ?? {});
        break;
      case "update":
        await updateServiceProduct(viewer, String(body.serviceProductId), body.package ?? {});
        break;
      case "delete":
        await deleteServiceProduct(viewer, String(body.serviceProductId));
        break;
      case "setStatus": {
        const status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
        await setServiceProductStatus(viewer, String(body.serviceProductId), status);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      packages: await listOwnServiceProducts(viewer),
      capabilityDomains: await listCapabilityDomains(),
    });
  } catch (e) {
    return handle(e, "Could not save the service product");
  }
}

function handle(e: unknown, fallback: string) {
  if (e instanceof OnboardingError) {
    const status = e.code === "NOT_A_PROVIDER" ? 404 : e.code === "GATE_UNMET" ? 403 : 400;
    return NextResponse.json(
      { error: e.message, code: e.code, ...(e.fields ? { fields: e.fields } : {}) },
      { status }
    );
  }
  console.error("[service-products]", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
