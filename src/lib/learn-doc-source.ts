
/** A landing page pretending to be a topic. Title-based, deliberately. */
const LANDING_TITLE = /\b(get started|getting started|home|index|documentation|book list|table of contents|all books)\b/i;

const MIN_TEXT_CHARS = 1_500;

export type DocExtract = { title: string | null; text: string };

export function extractDocText(html: string): DocExtract {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : null;

  const body = html
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return {
    title: title || null,
    text: decodeEntities(body).replace(/\s+/g, " ").trim(),
  };
}

/** The handful of entities that actually appear in Oracle's topics. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#x?[0-9a-f]+;/gi, " ");
}

export type TopicVerdict = { ok: true } | { ok: false; reason: string };

export function validateTopicPage(input: {
  requestedUrl: string;
  finalUrl: string;
  title: string | null;
  text: string;
}): TopicVerdict {
  const want = safePath(input.requestedUrl);
  const got = safePath(input.finalUrl);
  if (want === null || got === null) return { ok: false, reason: "Unparseable URL." };
  if (want !== got) {
    return {
      ok: false,
      reason: `Redirected away from the topic: asked for ${want}, landed on ${got}. The version is probably retired — find the current one rather than storing this.`,
    };
  }
  if (!input.title) return { ok: false, reason: "No <title>; not a documentation topic." };
  if (LANDING_TITLE.test(input.title)) {
    return { ok: false, reason: `"${input.title}" is a landing page, not a topic.` };
  }
  if (input.text.length < MIN_TEXT_CHARS) {
    return {
      ok: false,
      reason: `Only ${input.text.length} characters of body text — too thin to be a topic (need ${MIN_TEXT_CHARS}).`,
    };
  }
  return { ok: true };
}

function safePath(u: string): string | null {
  try {
    return new URL(u).pathname;
  } catch {
    return null;
  }
}

/** How the stored text is labelled inside the prompt. See WS2. */
export const DOC_SOURCE_LABEL = "REFERENCE DOCUMENTATION (vendor, not instructor)";

/** Trim stored documentation to what a prompt can carry. */
export const MAX_DOC_CHARS_PER_COURSE = 6_000;

export function docExcerpt(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  return t.length > MAX_DOC_CHARS_PER_COURSE ? `${t.slice(0, MAX_DOC_CHARS_PER_COURSE)}…` : t;
}
