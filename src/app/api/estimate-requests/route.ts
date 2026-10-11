import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { createRequest, EstimateRequestError } from "@/lib/estimate-requests";

// EST-E001: a buyer asks a provider for an estimate (multipart: fields + up to 3 files).
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const f = await req.formData().catch(() => null);
  if (!f) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const str = (k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");
  const cents = (k: string) => (str(k) ? Math.round(Number(str(k).replace(/[^0-9.]/g, "")) * 100) : null);
  try {
    const id = await createRequest(
      gate,
      { providerPersonId: str("providerPersonId"), serviceId: str("serviceId") || null, serviceProductId: str("serviceProductId") || null, description: str("description"), startBy: str("startBy") || null, budgetMinCents: cents("budgetMin"), budgetMaxCents: cents("budgetMax") },
      f.getAll("files").filter((x): x is File => typeof x !== "string")
    );
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof EstimateRequestError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    console.error("[estimate-requests]", e);
    return NextResponse.json({ error: "Could not send that request" }, { status: 500 });
  }
}
