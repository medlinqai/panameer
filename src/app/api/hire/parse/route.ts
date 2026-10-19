import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { parsePosting } from "@/lib/service-description";
import { extractText, mimeFromName, ExtractError } from "@/lib/resume/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

// SD-E003: "Upload a posting" — pasted text or a .docx / .pdf, read into the Service Description standard (not saved yet).
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  let text = "";
  try {
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (file instanceof File) {
        const mime = file.type || mimeFromName(file.name) || "application/octet-stream";
        text = await extractText(Buffer.from(await file.arrayBuffer()), mime, file.name);
      } else text = String(form.get("text") ?? "");
    } else {
      text = String(((await request.json().catch(() => ({}))) as { text?: string }).text ?? "");
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof ExtractError ? e.message : "We couldn't read that file." }, { status: 400 });
  }
  text = text.trim();
  if (text.length < 60) return NextResponse.json({ error: "Paste the whole posting — that's too short to read." }, { status: 400 });
  // PC-E001: pass 1 classifies the Business Type, pass 2 reads the six parts with it.
  const out = await parsePosting(text.slice(0, 40_000));
  if (!out.ok) return NextResponse.json({ error: out.reason === "no_key" ? "The posting reader isn't switched on here. Fill it in yourself." : "We couldn't read that posting. Fill it in yourself, or try again." }, { status: out.reason === "no_key" ? 503 : 422 });
  return NextResponse.json({ sd: out.sd });
}
