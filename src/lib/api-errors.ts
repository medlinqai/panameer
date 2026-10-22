import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

// HP-E006: errors say what went wrong. Known errors carry their own message; a duplicate says which; anything
// unexpected says "Couldn't save — try again" with a short reference that is logged server-side.
const KNOWN_DUPES: [RegExp, string][] = [
  [/proposal_requests.*job_id.*provider_person_id|job_id_provider_person_id/i, "This provider already has a request on this job."],
  [/proposals.*job_id.*provider_person_id/i, "This provider already responded on this job."],
  [/shortlist/i, "That provider is already on the shortlist."],
];

export function apiError(e: unknown, tag: string, known: (new (...a: never[]) => Error)[] = []): NextResponse {
  if (known.some((K) => e instanceof K)) return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  const err = e as { code?: string; meta?: { target?: unknown; modelName?: string }; message?: string };
  if (err?.code === "P2002") {
    const target = `${err.meta?.modelName ?? ""} ${JSON.stringify(err.meta?.target ?? "")} ${err.message ?? ""}`;
    const hit = KNOWN_DUPES.find(([re]) => re.test(target));
    return NextResponse.json({ error: hit?.[1] ?? "That already exists." }, { status: 409 });
  }
  if (err?.code === "P2025") return NextResponse.json({ error: "That record isn't there any more — refresh and try again." }, { status: 404 });
  const ref = randomBytes(3).toString("hex").toUpperCase();
  console.error(`[${tag}] ref ${ref}:`, e);
  return NextResponse.json({ error: `Couldn't save — try again. (Ref ${ref})`, ref }, { status: 500 });
}
