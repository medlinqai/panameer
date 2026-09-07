import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { createTicket, setTicketScreenshot, SupportError } from "@/lib/support";
import { allSupportApplicationValues } from "@/lib/support-applications";
import {
  MAX_PHOTO_BYTES,
  StorageError,
  uploadSupportScreenshot,
} from "@/lib/storage";

/**
 * POST /api/support/tickets — file a bug report (`P2-J1.1-E032` WS-1/WS-3).
 *
 * ⚠⚠ THIS ROUTE DID NOT EXIST. `src/app/api/support/` was absent from disk while
 * `BugReportForm`'s own comment said *"Wiring `POST /api/support/bug` is the only
 * change needed when the backend lands."* Everything typed into that box was
 * discarded.
 *
 * ⚠ `multipart/form-data`, NOT JSON, because the screenshot rides along —
 * following `api/company/logo/route.ts`'s shape rather than inventing a second
 * upload pattern. Nine upload routes already do it this way.
 *
 * OWNER-SCOPED: the reporter, their name, their email and their P-Account are all
 * resolved from the SESSION in `createTicket`. The body carries no identity.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };

  const application = str("application");
  /* ⚠ VALIDATED AGAINST THE DERIVED SET, not a hand-written list — the same
     module the form renders from, so the two cannot disagree about what a legal
     value is. Both rails plus `onboarding`/`other` are accepted regardless of
     the caller's own role: a provider may legitimately report an onboarding bug,
     and refusing the other rail's value would only teach people to pick
     `Other`. */
  if (!allSupportApplicationValues().includes(application)) {
    return NextResponse.json({ error: "Pick where it happened" }, { status: 400 });
  }

  let ticket: { id: string; ticket_code: string };
  try {
    ticket = await createTicket(viewer, {
      application,
      title: str("title"),
      description: str("description"),
      howFound: str("howFound") || null,
      priority: str("priority") || "Medium",
    });
  } catch (e) {
    if (e instanceof SupportError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[support] create failed:", e);
    return NextResponse.json({ error: "Could not file that ticket" }, { status: 500 });
  }

  /*
    ── ⚠⚠ THE SCREENSHOT IS OPTIONAL, AND ITS FAILURE MUST NOT LOSE THE TICKET ──

    The ticket is already written by the time we get here, deliberately: the
    object path is foldered by ticket id, and — more importantly — a storage
    outage must never turn a filed bug report back into a discarded one. That is
    the exact defect this whole feature exists to end. A failed upload is
    reported alongside a SUCCESSFUL filing, never instead of it.
  */
  const entry = form.get("screenshot");
  let screenshotError: string | null = null;
  if (entry instanceof File && entry.size > 0) {
    if (entry.size > MAX_PHOTO_BYTES) {
      screenshotError = "That image is too large (5MB max) — the ticket was filed without it.";
    } else {
      try {
        const path = await uploadSupportScreenshot(ticket.id, {
          name: entry.name,
          type: entry.type,
          size: entry.size,
          bytes: await entry.arrayBuffer(),
        });
        await setTicketScreenshot(ticket.id, path);
      } catch (e) {
        console.error("[support] screenshot upload failed:", e);
        screenshotError =
          e instanceof StorageError
            ? `${e.message} The ticket was filed without it.`
            : "The screenshot could not be stored — the ticket was filed without it.";
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ticketId: ticket.id,
    ticketCode: ticket.ticket_code,
    screenshotError,
  });
}
