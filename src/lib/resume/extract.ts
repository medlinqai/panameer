/**
 * Document → plain text (brief_P / E012).
 *
 * SERVER ONLY. Handles the formats the upload modal accepts: PDF, Word
 * (.docx), and rich/plain text. Both parser libraries are imported LAZILY
 * inside the branch that needs them — pdf-parse pulls in a sizeable pdf.js
 * bundle, and loading it during `next build` page-data collection for routes
 * that merely import this module is pure cost (see the lazy-client pitfall).
 */

export const ACCEPTED_DOC_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc (legacy binary — best effort)
  "application/rtf",
  "text/rtf",
  "text/plain",
] as const;

/** E012 — "PDF / Word / rich text, ≤5MB". */
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

export class ExtractError extends Error {
  constructor(
    message: string,
    public code: "UNSUPPORTED" | "TOO_LARGE" | "EMPTY" | "FAILED"
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

/** Map a filename to a mime when the browser sends a vague one. */
export function mimeFromName(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "rtf":
      return "application/rtf";
    case "txt":
      return "text/plain";
    default:
      return null;
  }
}

/** Strip RTF control words to leave readable text. */
function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\line\b/g, "\n")
    .replace(/\{\\\*[^}]*\}/g, "") // drop destination groups wholesale
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
}

/**
 * Extract plain text from an uploaded document.
 * Throws `ExtractError` with a user-facing message on anything unusable.
 */
export async function extractText(
  bytes: Buffer,
  mime: string,
  fileName?: string
): Promise<string> {
  if (bytes.byteLength > MAX_DOC_BYTES) {
    throw new ExtractError(
      "That file is larger than 5 MB. Please upload a smaller file.",
      "TOO_LARGE"
    );
  }

  const resolved =
    (ACCEPTED_DOC_MIME as readonly string[]).includes(mime) && mime !== "application/octet-stream"
      ? mime
      : (fileName ? mimeFromName(fileName) : null) ?? mime;

  let text = "";
  try {
    if (resolved === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(bytes) });
      try {
        const result = await parser.getText();
        text = result.text ?? "";
      } finally {
        await parser.destroy?.();
      }
    } else if (
      resolved ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: bytes });
      text = result.value ?? "";
    } else if (resolved === "application/rtf" || resolved === "text/rtf") {
      text = rtfToText(bytes.toString("utf8"));
    } else if (resolved === "text/plain") {
      text = bytes.toString("utf8");
    } else if (resolved === "application/msword") {
      // Legacy binary .doc has no pure-JS parser worth carrying. Salvage the
      // readable runs so the user still gets *something* rather than a hard
      // failure, and let the parser's gap list report what was lost.
      text = bytes
        .toString("latin1")
        .replace(/[^\x20-\x7E\n\r\t]+/g, " ")
        .replace(/\s{3,}/g, "\n");
    } else {
      throw new ExtractError(
        "That file type isn't supported. Upload a PDF, Word, or rich-text file.",
        "UNSUPPORTED"
      );
    }
  } catch (e) {
    if (e instanceof ExtractError) throw e;
    console.error("[resume] text extraction failed:", e);
    throw new ExtractError(
      // WS2 (E069) — name the fix, not just the failure. A scanned or
      // password-protected PDF has no text layer at all, and "try the .docx"
      // is the one instruction that actually resolves it.
      "We couldn't read this file — try the .docx version. (Scanned or password-protected PDFs have no text we can read.)",
      "FAILED"
    );
  }

  const cleaned = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length < 40) {
    throw new ExtractError(
      "We couldn't read this file — try the .docx version. (It looks like a scanned image, so there's no text layer to read.)",
      "EMPTY"
    );
  }
  return cleaned;
}
