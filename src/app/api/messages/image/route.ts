import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { MAX_BODY, MessageError, canMessage, sendMessage } from "@/lib/messages";
import { ALLOWED_PHOTO_MIME, MAX_PHOTO_BYTES, StorageError, uploadMessageImage } from "@/lib/storage";

export const runtime = "nodejs";

// Send a message with an image (pasted, dropped or attached). Permission is checked before anything is stored.
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const form = await req.formData().catch(() => null);
  const toUserId = String(form?.get("toUserId") ?? "");
  const body = String(form?.get("body") ?? "").slice(0, MAX_BODY);
  const file = form?.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(toUserId) || !(file instanceof File)) return NextResponse.json({ error: "Pick an image to send." }, { status: 400 });
  if (!(ALLOWED_PHOTO_MIME as readonly string[]).includes(file.type)) return NextResponse.json({ error: "Images must be PNG, JPG or WebP." }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "That image is too large (5MB max)." }, { status: 413 });
  const ok = await canMessage(gate, toUserId);
  if (!ok.ok) return NextResponse.json({ error: ok.message, code: ok.reason }, { status: 403 });
  try {
    const path = await uploadMessageImage(gate.userId, { type: file.type, size: file.size, bytes: await file.arrayBuffer() });
    const row = await sendMessage(gate, toUserId, body, { path, type: file.type });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_CONFIGURED" ? 503 : 400 });
    if (e instanceof MessageError) return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    throw e;
  }
}
