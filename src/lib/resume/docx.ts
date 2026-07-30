import JSZip from "jszip";

/**
 * .docx → text, straight from `word/document.xml` — the ORACLE the extraction
 * test measures mammoth against (WS-A / E051). NOT the production reader.
 *
 * WHY IT EXISTS AND WHY IT ISN'T USED. The brief expected
 * `mammoth.extractRawText` to skip table cells and text boxes, sending table
 * résumés to ~563 characters. This walker was written to replace it. Then it was
 * measured, and mammoth turned out to read both: across all ten .docx fixtures
 * it is missing ZERO words against this walker's output, tables and text boxes
 * included, and `ppm.docx` (11 tables) extracts to 6022 characters rather than
 * 563. The premise did not hold on a single file.
 *
 * The first version of this walker appeared to find 19–26% more text on the
 * sidebar CVs. That was an artifact of `mc:Fallback` (below): Word writes each
 * text box twice, so the "missing" content was the second copy. With the
 * fallback skipped it lands within ±2% of mammoth.
 *
 * So it stays as an INSTRUMENT rather than a replacement — a test can assert
 * that mammoth still loses nothing against a direct read of the XML, which is
 * exactly the regression that would silently gut every import if a future
 * mammoth upgrade did start dropping parts. Keeping it in the test path costs a
 * devDependency; putting it in the production path would trade a mature reader
 * for our own, for a measured gain of zero.
 */

/** Word parts that carry body text. Headers/footers are deliberately excluded. */
const BODY_PART = "word/document.xml";

/**
 * Tags that end a line of text. `w:p` is a paragraph; `w:tr` a table row; `w:br`
 * an explicit break. `w:tc` (a cell) ends with a TAB rather than a newline so a
 * row stays one line — which is what lets `delinearize()` see a two-column
 * layout as two columns instead of a single run-on.
 */
const NEWLINE_AFTER = new Set(["w:p", "w:tr", "w:txbxContent"]);
const TAB_AFTER = new Set(["w:tc"]);

/**
 * Subtrees whose text must NOT be emitted:
 *
 *  - `w:instrText` — field CODES (` HYPERLINK "http://…" `), not visible text.
 *  - `w:delText`   — tracked-change deletions; the author removed them.
 *  - `mc:Fallback` — THE DUPLICATION TRAP. Word writes a text box twice: the
 *    modern DrawingML shape inside `mc:Choice`, and a legacy VML copy of the
 *    SAME content inside `mc:Fallback` for old readers. A walker that takes both
 *    emits every sidebar twice — which is not merely untidy, it doubles every
 *    section heading in the rail and leaves the section detector picking between
 *    two identical candidates. Caught by reading the recovered text rather than
 *    the character count: the count looked like a clean win.
 */
const SKIP_RUN = new Set(["w:instrText", "w:delText", "mc:Fallback"]);

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" doesn't become "<"
}

/**
 * Walk one Word XML part in document order and emit its visible text.
 *
 * A tag scanner rather than a DOM parse: we need six tag names out of a schema
 * with hundreds, the input is machine-generated (so well-formed), and adding an
 * XML parser to read six tags would be a dependency with more failure modes than
 * the thing it replaces.
 */
export function wordXmlToText(xml: string): string {
  const out: string[] = [];
  let skipDepth = 0;
  let inText = false;

  // Matches an opening, closing or self-closing tag, capturing name and slashes.
  const TAG = /<(\/?)([a-zA-Z0-9:]+)([^>]*?)(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TAG.exec(xml)) !== null) {
    const [full, closing, name, , selfClosing] = m;

    // Text living between the previous tag and this one belongs to the run we
    // are inside, if any.
    if (inText && skipDepth === 0) {
      const chunk = xml.slice(last, m.index);
      if (chunk) out.push(decodeEntities(chunk));
    }
    last = m.index + full.length;

    if (SKIP_RUN.has(name)) {
      if (closing) skipDepth = Math.max(0, skipDepth - 1);
      else if (!selfClosing) skipDepth++;
      inText = false;
      continue;
    }

    if (name === "w:t") {
      inText = !closing && !selfClosing;
      continue;
    }
    inText = false;

    if (skipDepth > 0) continue;

    if (name === "w:tab" ) out.push("\t");
    else if (name === "w:br" || name === "w:cr") out.push("\n");
    else if (closing && NEWLINE_AFTER.has(name)) out.push("\n");
    else if (closing && TAB_AFTER.has(name)) out.push("\t");
  }

  return out.join("");
}

/**
 * Extract text from a .docx buffer.
 *
 * Only `word/document.xml`. Headers and footers are left out on purpose: they
 * repeat per page, so including them injects the same name and page number many
 * times over — noise the section detector then has to survive, in exchange for
 * ~70 characters of content already present in the body.
 */
export async function docxToText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file(BODY_PART);
  if (!part) throw new Error("not a Word document (no word/document.xml)");
  return wordXmlToText(await part.async("string"));
}
