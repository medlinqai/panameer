import "server-only";
import sharp from "sharp";

const WIDTH = 16;

const CACHE_MAX = 500;
const cache = new Map<string, string | null>();

function remember(key: string, value: string | null): string | null {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

async function readSource(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("/")) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      return await readFile(join(process.cwd(), "public", url.replace(/^\/+/, "")));
    }
    if (!/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

let genericBlur: string | null | undefined;

export async function genericBlurredPhoto(): Promise<string | null> {
  if (genericBlur !== undefined) return genericBlur;
  try {
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
