import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { createTicket, setTicketScreenshot, SupportError } from "@/lib/support";
import { allSupportApplicationValues } from "@/lib/support-applications";
import {
  MAX_PHOTO_BYTES,
  StorageError,
  uploadSupportScreenshot,
} from "@/lib/storage";

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
