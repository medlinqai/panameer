import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";

export async function POST() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(
    {
      error:
        "Releasing an order is no longer a separate step — both parties accept the terms, and the second acceptance opens the order for settlement.",
      code: "GONE",
    },
    { status: 410 }
  );
}
