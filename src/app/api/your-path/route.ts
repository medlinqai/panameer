import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { lifecycleForUser } from "@/lib/your-path";

// Account menu's Your Path block: step N of 7, the status, and the next step.
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await lifecycleForUser(gate.userId);
  if (!p) return NextResponse.json({ path: null });
  const next = p.steps[p.current];
  return NextResponse.json({ path: { current: p.current, done: p.done, status: p.status, next: next ? { label: next.next, href: next.href } : null } });
}
