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
/**
 * ── ⚠⚠⚠ THE PROVIDER WITH NO PHOTO (`P2-A1.1-E778`) ────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-02:** the no-photo providers show the plain silhouette while
 * everyone else is blurred, so the grid reads as two different products.
 *
 * ⚠⚠ **MEASURED: 3 OF 63 ELIGIBLE PROVIDERS (5%) HAVE NO `photo_url`.** Small,
 * and visible precisely because it is small — three odd cards in a wall of sixty.
 *
 * ⚠⚠⚠ **IT IS ONE SHARED IMAGE, GENERATED ONCE, AND IT CARRIES NOTHING ABOUT
 * ANYBODY.** A per-person placeholder would be inventing a face; a shared one
 * says only *"a photo goes here"*. ⚠ It is built through the SAME pipeline as a
 * real photo — same 16px raster, same encoder, same size — so a reader cannot
 * tell from the treatment whether a photo exists, which is the point.
 *
 * ⚠ Deliberately NOT a file on disk: generating it keeps one code path, and a
 * committed binary would have to be kept in step with `WIDTH` by hand.
 */
let genericBlur: string | null | undefined;

export async function genericBlurredPhoto(): Promise<string | null> {
  if (genericBlur !== undefined) return genericBlur;
  try {
    /* ⚠ A flat neutral at the same dimensions as a real blur. The colour sits
       between the light and dark surfaces so it reads as a placeholder in both
       schemes rather than as a bright or black square. */
    const out = await sharp({
      create: { width: WIDTH, height: WIDTH, channels: 3, background: { r: 150, g: 145, b: 160 } },
    })
      .jpeg({ quality: 40 })
      .toBuffer();
    genericBlur = `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    genericBlur = null;
  }
  return genericBlur;
}

export async function blurredPhotoDataUri(photoUrl: string | null | undefined): Promise<string | null> {
  const url = photoUrl?.trim();
  /* ⚠⚠ NO PHOTO IS NOT NOTHING (`E778`) — it is the shared placeholder, so every
     masked card gets the same treatment. ⚠ A failed READ still falls back to it
     too, below: the reader should never be able to tell a missing photo from an
     unreachable one. */
  if (!url) return genericBlurredPhoto();
  if (cache.has(url)) return cache.get(url) ?? null;

  const input = await readSource(url);
  if (!input) return remember(url, await genericBlurredPhoto());

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
    return remember(url, await genericBlurredPhoto());
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
