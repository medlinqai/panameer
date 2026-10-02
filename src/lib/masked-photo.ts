import "server-only";
import sharp from "sharp";

/**
 * ── ⚠⚠⚠ THE BLURRED PHOTO, MADE ON THE SERVER (`P2-A1.1-E767`) ─────────────
 *
 * ⚠ **SCOTT, 2026-10-02:** *"it would look better to show the photo, but
 * blurry… maybe all that info, but blurry."*
 *
 * ⚠⚠⚠ **A CSS `blur()` ON THE REAL PHOTO IS NOT MASKING — IT IS DECORATION OVER
 * A FILE THE VISITOR ALREADY HAS.** The original URL would be in the HTML, in
 * dev tools, in view-source and in the network tab, one right-click from the
 * face it is supposed to hide. ⚠ So nothing here ever puts an original URL in a
 * masked payload.
 *
 * ⚠⚠ **WHAT IT RETURNS IS A 16px-WIDE JPEG AS A `data:` URI.** Not a link to a
 * derivative — the bytes themselves, inline. ⚠⚠⚠ **THAT IS DELIBERATELY STRONGER
 * THAN A SEPARATE ENDPOINT: there is no URL to enumerate, no id to iterate, and
 * no cache key that could be guessed back to a person.**
 *
 * ⚠ **AND IT IS NOT REVERSIBLE.** 16px across is roughly 250 pixels of colour
 * for a whole face; the information is not blurred, it is **gone** — the
 * downscale discards it before the bytes are ever written.
 *
 * ⚠⚠ **SEED AVATARS GO THROUGH THE SAME PATH** (Scott's ruling). 54 of the 60
 * photos on this database are local `/seed-avatars/*.svg`; rasterising them here
 * means the masked surfaces have ONE code path, and an SVG's markup — which is
 * text, and would otherwise ship verbatim — never reaches the page either.
 */

/** ⚠ The whole mask. 16px across is the fact that makes this irreversible. */
const WIDTH = 16;

/**
 * ⚠⚠ ONE PROCESS-LIFETIME CACHE, AND IT IS BOUNDED. `/explore` renders 12 cards,
 * so without this a single page view is 12 fetches and 12 decodes. ⚠ Keyed on
 * the SOURCE URL because that is what the bytes depend on; a person who changes
 * their photo gets a new key for free.
 * ⚠⚠⚠ **THE BOUND IS NOT OPTIONAL** — an unbounded map keyed on a user-supplied
 * URL is a memory leak with an attacker's hand on the tap.
 */
const CACHE_MAX = 500;
const cache = new Map<string, string | null>();

function remember(key: string, value: string | null): string | null {
  if (cache.size >= CACHE_MAX) {
    /* ⚠ Oldest-first eviction. `Map` preserves insertion order, so the first key
       is the oldest — enough for a cache whose job is one page render. */
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

/**
 * ⚠⚠ RESOLVE A STORED `photo_url` TO BYTES.
 * ⚠ A relative path is a file in `public/`; anything else is fetched.
 * ⚠⚠⚠ **IT NEVER THROWS.** A masked card that cannot render its blur must still
 * render — the fallback is the existing placeholder icon, which is a worse
 * picture and an equally safe one. A throw here would take down `/explore`.
 */
async function readSource(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("/")) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      return await readFile(join(process.cwd(), "public", url.replace(/^\/+/, "")));
    }
    if (!/^https?:\/\//i.test(url)) return null;
    /* ⚠ A short timeout: this runs inside a page render, and a slow photo host
       must not hold the whole grid. */
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * ⚠⚠ THE ONE ENTRY POINT. Returns a `data:` URI, or `null` when there is no
 * usable photo — and `null` is a real answer, not a failure: the caller falls
 * back to the placeholder icon that masked surfaces already draw.
 */
export async function blurredPhotoDataUri(photoUrl: string | null | undefined): Promise<string | null> {
  const url = photoUrl?.trim();
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;

  const input = await readSource(url);
  if (!input) return remember(url, null);

  try {
    const out = await sharp(input, {
      /* ⚠ An SVG is rendered at a sane size before the downscale; without a
         density the rasteriser can produce a 1px image for a viewBox-only file. */
      density: 72,
    })
      .resize(WIDTH, WIDTH, { fit: "cover", position: "attention" })
      .jpeg({ quality: 40 })
      .toBuffer();
    return remember(url, `data:image/jpeg;base64,${out.toString("base64")}`);
  } catch {
    return remember(url, null);
  }
}

/**
 * ── ⚠⚠⚠ THE TEXT PLACEHOLDERS — FIXED LENGTH, FIXED ALPHABET ───────────────
 *
 * ⚠ **SCOTT, 2026-10-02:** *"fixed-length placeholders, not same-length — no
 * length leak, fixed alphabet."*
 *
 * ⚠⚠⚠ **A SAME-LENGTH SCRAMBLE WOULD HAVE LEAKED THE CHARACTER COUNT OF A NAME,
 * WHICH TODAY'S PAYLOAD DOES NOT LEAK AT ALL.** Over a whole grid that is a real
 * narrowing — initials plus a length is often one person.
 * ⚠⚠ **AND THE ALPHABET IS FIXED, NOT THE REAL LETTERS.** Shuffling the person's
 * own characters preserves their letter multiset, which is worse than a length:
 * it is nearly an anagram.
 *
 * ⚠ So these are CONSTANTS. They depend on nothing about the person, which is
 * the strongest statement a placeholder can make.
 */
export const PLACEHOLDER = {
  /** ⚠ A name-shaped bar. Rendered blurred, never as readable text. */
  name: "Anskeld Marrowen",
  employer: "Verthane Industries",
  client: "Oridane Group",
  rate: "$000 / hr",
  contact: "name@example.com",
} as const;
