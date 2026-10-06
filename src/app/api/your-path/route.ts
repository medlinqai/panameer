import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { pathForUser } from "@/lib/your-path";

// Account menu's Your Path block: step N of 6 and the next step.
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await pathForUser(gate.userId);
  if (!p) return NextResponse.json({ path: null });
  const next = p.steps[p.current];
  return NextResponse.json({ path: { current: p.current, done: p.done, role: p.role, next: next ? { label: next.next, href: next.href } : null } });
}
