import JSZip from "jszip";

/** Word parts that carry body text. Headers/footers are deliberately excluded. */
const BODY_PART = "word/document.xml";

const NEWLINE_AFTER = new Set(["w:p", "w:tr", "w:txbxContent"]);
const TAB_AFTER = new Set(["w:tc"]);

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

export async function docxToText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file(BODY_PART);
  if (!part) throw new Error("not a Word document (no word/document.xml)");
  return wordXmlToText(await part.async("string"));
}
