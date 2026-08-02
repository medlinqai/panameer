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

/**
 * Share of alphabetic tokens that look like words — 3+ letters containing a
 * vowel. Real prose sits at 0.85+; scraped binary sits below 0.4.
 */
export function proseRatio(text: string): number {
  const tokens = text.split(/[^A-Za-z]+/).filter(Boolean);
  if (tokens.length < 50) return 1; // too short to judge; the length floor covers it
  const wordy = tokens.filter((w) => w.length >= 3 && /[aeiou]/i.test(w));
  return wordy.length / tokens.length;
}

/** Below this, the "text" is a scrape of a binary container, not a document. */
export const MIN_PROSE_RATIO = 0.6;

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
        /*
          STRIP pdf-parse's PAGE SEPARATORS (E154). v2 writes "-- 1 of 3 --"
          between pages — its own marker, not text from the document. Measured
          on the three PDF fixtures: 3, 3 and 4 of them.

          They matter because the parser reads structurally. A line of that
          shape lands mid-employer as often as not, splitting one role's bullets
          into two blocks, and "1 of 3" is exactly the kind of token a date or
          duration heuristic can misread.
        */
        text = (result.text ?? "").replace(/^[ \t]*--\s*\d+\s*of\s*\d+\s*--[ \t]*$/gim, "");
      } finally {
        await parser.destroy?.();
      }
    } else if (
      resolved ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      /*
        WS-A — STAYS on mammoth, and that is a finding, not an omission.

        The brief expected `extractRawText` to skip table cells and text boxes,
        sending table résumés to ~563 chars. Measured on all ten .docx fixtures,
        it does neither: `ppm.docx` (11 tables) extracts to 6022 characters, and
        against a de-duplicated walk of `word/document.xml` mammoth is missing
        ZERO words on every file — tables and text boxes included. The ~563-char
        figure did not reproduce anywhere.

        A first pass at a hand-rolled XML walker measured a apparent 19–26% gain
        on the sidebar CVs. That was an artifact: Word writes each text box TWICE
        (`mc:Choice` + `mc:Fallback`), so counting every `w:t` double-counts the
        rail. With the fallback branch skipped the walker lands within ±2% of
        mammoth and produces an identical word set. The walker survives in
        `docx.ts` as the ORACLE the extraction test measures against — it is
        worth keeping as a regression detector if mammoth ever does start
        dropping parts — but replacing a mature reader in the production path
        with our own, for a measured gain of zero, would be all risk.

        The real extraction failure on these files is legacy `.doc` — see below.
      */
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

  /*
    WS-A — the salvage guard, and the extraction bug that IS real on these files.

    Legacy binary `.doc` has no pure-JS parser worth carrying, so the branch above
    scrapes printable runs out of the container. On a real .doc that yields mostly
    OLE table junk: `EPM Ashok.doc` came out as 51,298 characters beginning
    "> P bjbj h h < _ _ H 8 Q %", and `FIN_Chakrahdar.doc` as 80,947.

    Both sailed past the 40-character floor, so the import REPORTED SUCCESS and
    handed the parser noise, which duly produced 16 and 40 "skills" — the second
    one hitting the cap exactly, i.e. a profile filled entirely with garbage that
    the provider then has to notice and undo. A silent wrong answer is worse than
    a refusal, and this one arrives dressed as a win.

    The separation is not marginal. Share of alphabetic tokens that look like
    words (3+ letters containing a vowel), measured across all fifteen fixtures:
    every real document scores 0.85–0.88; the two .doc salvages score 0.35 and
    0.22. The 0.6 threshold sits in an empty gap between the two populations.
  */
  if (cleaned.length >= 40 && proseRatio(cleaned) < MIN_PROSE_RATIO) {
    throw new ExtractError(
      "We couldn't read this Word file — it's the older .doc format. Re-save it as .docx and upload that.",
      "FAILED"
    );
  }

  if (cleaned.length < 40) {
    throw new ExtractError(
      "We couldn't read this file — try the .docx version. (It looks like a scanned image, so there's no text layer to read.)",
      "EMPTY"
    );
  }
  return cleaned;
}
