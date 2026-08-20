/**
 * REFERENCE DOCUMENTATION AS ASSESSMENT SOURCE — fetching it, and refusing to
 * store the wrong thing (brief_learn_assessments_generate WS1).
 *
 * ── ⚠ WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * `buildAssessmentSource` writes tests from lesson TITLES, because 290 of the
 * 522 lessons have no description. A question written from
 * `"STEP 3 - How to Create a Qualification Area"` tests the title, not the
 * lesson. Oracle's own topic for that application states the four statuses, the
 * rule that scored weights must add up to 100, and the knockout requirement —
 * material a question can actually be right or wrong about.
 *
 * ── ⚠ VERSION-PINNED ORACLE URLS ROT, AND THEY ROT SILENTLY ──────────────────
 *
 * Measured 2026-08-19:
 *
 *   .../procurement/26c/oaprc/qualification-areas.html  → 200, "Qualification
 *                                                          Areas", 17,841 chars
 *   .../procurement/25a/oaprc/qualification-areas.html  → 302 → .../26c/index.html
 *                                                          "Oracle Procurement
 *                                                          26C - Get Started"
 *
 * The second is the dangerous one: it is a 200 at the end of a redirect chain
 * with a full page of HTML, and a naive fetcher stores a marketing landing page
 * as the syllabus for a graded test. `validateTopicPage` is what stops that, and
 * it FAILS LOUDLY rather than storing something plausible.
 *
 * ── ⚠ COUNSEL GATE ───────────────────────────────────────────────────────────
 *
 * Storing this text and generating derived graded content from it is a LICENSING
 * question that is NOT answered. The path works; exactly one course is populated
 * as a demonstration. Nothing is bulk-populated until that is cleared.
 */

/** A landing page pretending to be a topic. Title-based, deliberately. */
const LANDING_TITLE = /\b(get started|getting started|home|index|documentation|book list|table of contents|all books)\b/i;

/**
 * The floor for "this is a real topic".
 *
 * 1,500 characters. The real topic measured 17,841 and the landing page's own
 * body is substantial too, so length alone cannot separate them — this only
 * catches a stub or an error page, and the URL and title checks do the work.
 */
const MIN_TEXT_CHARS = 1_500;

export type DocExtract = { title: string | null; text: string };

/**
 * HTML → the title and the readable body.
 *
 * A regex stripper rather than a DOM parser: this runs in a script against one
 * page at a time, the output is prompt text rather than markup, and adding a
 * parser dependency to read a `<title>` would be the wrong trade. `<script>`,
 * `<style>` and `<noscript>` are removed BEFORE tags are stripped, or their
 * contents end up in the source text as gibberish the model would try to test.
 */
export function extractDocText(html: string): DocExtract {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : null;

  /*
    ⚠ `<head>` GOES TOO, not just `<script>`. The title otherwise appears twice —
    once as the title and again at the head of the body text — and every `<meta>`
    description with it. Harmless to read, but it is the first thing in the prompt
    and duplicated text is the sort of thing a model treats as emphasis.
  */
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

/**
 * Is what came back actually the topic that was asked for?
 *
 * ⚠ THE URL CHECK IS THE LOAD-BEARING ONE. A version that no longer exists
 * REDIRECTS, and the destination is a real page with a real title and thousands
 * of words. Comparing the final pathname to the requested one is the only test
 * that notices, because everything else about the response looks fine.
 */
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

/**
 * Trim stored documentation to what a prompt can carry.
 *
 * Per course, because one course is one Oracle application. The cap is here
 * rather than at fetch time so the full topic is kept in the row and the
 * TRUNCATION is a prompt decision — a later prompt with more room does not need
 * a re-fetch.
 */
export const MAX_DOC_CHARS_PER_COURSE = 6_000;

export function docExcerpt(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  return t.length > MAX_DOC_CHARS_PER_COURSE ? `${t.slice(0, MAX_DOC_CHARS_PER_COURSE)}…` : t;
}
