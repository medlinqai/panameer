/**
 * ── ⚠⚠ SEED AVATARS — ILLUSTRATED, LOCAL, DETERMINISTIC (`P0-E595` WS-B) ────
 *
 * ⚠ SCOTT, 2026-09-21, ruling on the WS-B gate: *"Photos: illustrated avatars
 * for seeded providers. Make them clearly illustrated, not photoreal and not
 * stock people. Generate them locally and deterministically per persona, with
 * no outside service, and mark them as seed data."*
 *
 * ⚠⚠⚠ AND THE HALF THAT BINDS ANY LATER EDIT: *"'Photo REQUIRED to publish'
 * stays locked. Only the test data changes, never the rule."* ⚠ Nothing in
 * `access.ts`, `completeness.ts` or the wizard is touched by this file. A real
 * provider still uploads a real photo; a SEEDED persona gets a drawing so that
 * the required set can be satisfied without inventing a human face.
 *
 * ── WHY A DRAWING AND NOT A FACE ───────────────────────────────────────────
 *
 * ⚠ The repo holds FOUR face images in total. Twenty-five personas sharing
 * three faces reads as a bug; an outside avatar service is a runtime dependency
 * on a seed that writes to the ONE shared production database, and load-bearing
 * rule 9 makes any outside call a decision rather than a convenience.
 * ⚠⚠ A FLAT GEOMETRIC BUST CANNOT BE MISTAKEN FOR A PHOTOGRAPH OF ANYBODY, which
 * is the entire point: it fills the column honestly instead of impersonating a
 * person who does not exist.
 *
 * ── HOW IT IS MARKED AS SEED DATA — FOUR WAYS, NONE OF THEM COSMETIC ────────
 *
 *   1  the path says so — `/seed-avatars/<slug>.svg`, its own directory
 *   2  an XML comment at the top of every file
 *   3  `data-panameer-seed="avatar"` on the root `<svg>`
 *   4  `<title>` / `<desc>`, which is what a screen reader and a DOM inspector
 *      both surface
 *
 * ⚠ NO VISIBLE WATERMARK, and that is a reported choice rather than an
 * oversight: a badge burnt into the picture would show up on provider cards
 * during a walk and be read as a product feature. ⚠ If Scott wants one visible,
 * it is one line in `avatarSvg` — say so.
 *
 * ── DETERMINISM IS THE PROPERTY THAT MATTERS ───────────────────────────────
 *
 * ⚠⚠ EVERY CHOICE BELOW COMES FROM AN FNV-1a HASH OF THE EMAIL — never from
 * `Math.random`, never from a counter, never from row order. Re-running the seed
 * produces BYTE-IDENTICAL files, so the generated art is a diffable artefact
 * rather than churn, and `git status` stays quiet on a re-seed.
 */

/** FNV-1a, 32-bit. Stable across machines and Node versions — no `hashCode`. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A named stream of small numbers off one seed, so adding a trait later does
 *  not re-roll every trait before it. */
function pick<T>(email: string, trait: string, options: readonly T[]): T {
  return options[hash32(`${email}:${trait}`) % options.length];
}

/**
 * ⚠ SKIN TONES — a spread, not a default. A seeded marketplace that is all one
 * tone is its own kind of wrong, and the spread costs nothing.
 */
const SKIN = ["#F3D2C0", "#E8B894", "#C98C5E", "#9C6340", "#6E4429", "#4A2F1E"] as const;
const HAIR = ["#2B2118", "#4A3423", "#7A4B22", "#B07434", "#8C8C94", "#22222A", "#5C3A6E"] as const;

/** The six hair shapes. Flat paths, no gradients — the "illustrated" part. */
const HAIR_STYLES = [0, 1, 2, 3, 4, 5] as const;

/** URL-safe, stable, and readable in the `photo_url` column at a glance. */
export function avatarSlug(email: string): string {
  const local = email.split("@")[0].toLowerCase();
  const base = local.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "persona";
  /* ⚠ The hash suffix is what makes two personas with the same local part
     (`seed.avery.okonkwo.1` vs `.11`) impossible to collide on. */
  return `${base}-${hash32(email).toString(36).slice(0, 6)}`;
}

/** The value written to `Person.photo_url`. Relative on purpose: `Avatar.tsx`
 *  renders a plain `<img src>` with no loader, so `public/` serves it directly
 *  on localhost, preview and production alike. */
export function avatarPath(email: string): string {
  return `/seed-avatars/${avatarSlug(email)}.svg`;
}

function hairPath(style: number, hair: string): string {
  switch (style) {
    case 0: // short round cap
      return `<path d="M82 112a46 46 0 0 1 92 0c0-34-20-52-46-52s-46 18-46 52Z" fill="${hair}"/>`;
    case 1: // bob, falling past the jaw
      return `<path d="M78 116c0-40 22-60 50-60s50 20 50 60v40h-14v-46c-12 8-24 12-36 12s-24-4-36-12v46H78Z" fill="${hair}"/>`;
    case 2: // close fade
      return `<path d="M84 104c6-28 22-42 44-42s38 14 44 42c-10-16-26-24-44-24s-34 8-44 24Z" fill="${hair}"/>`;
    case 3: // curls
      return `<g fill="${hair}"><circle cx="96" cy="84" r="20"/><circle cx="128" cy="70" r="22"/><circle cx="160" cy="84" r="20"/><circle cx="84" cy="104" r="14"/><circle cx="172" cy="104" r="14"/></g>`;
    case 4: // bun
      return `<g fill="${hair}"><circle cx="128" cy="48" r="16"/><path d="M82 112a46 46 0 0 1 92 0c0-34-20-52-46-52s-46 18-46 52Z"/></g>`;
    default: // side part
      return `<path d="M82 112c0-36 20-54 46-54 26 0 44 14 46 40-14-14-30-20-48-18-14 2-26 12-30 32-6-4-10 0-14 0Z" fill="${hair}"/>`;
  }
}

/**
 * One persona's avatar, as an SVG document.
 *
 * ⚠ 256×256, `viewBox` only — no width/height attributes, so `Avatar.tsx` sizes
 * it with CSS exactly as it sizes an uploaded photo.
 */
export function avatarSvg(email: string, displayName: string): string {
  const hue = hash32(`${email}:hue`) % 360;
  const skin = pick(email, "skin", SKIN);
  const hair = pick(email, "hair", HAIR);
  const style = pick(email, "hairstyle", HAIR_STYLES);
  const shirt = `hsl(${(hue + 165) % 360} 42% 42%)`;
  const bgTop = `hsl(${hue} 62% 88%)`;
  const bgBot = `hsl(${hue} 52% 72%)`;
  const id = avatarSlug(email);
  const safeName = displayName.replace(/[<>&]/g, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- PANAMEER SEED DATA — generated illustration, not a photograph of a real
     person. Written by prisma/seed-avatar.ts, deterministically from the
     persona's email address. Do not hand-edit: the next seed run overwrites it
     byte for byte. See P0-E595 WS-B. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"
     data-panameer-seed="avatar">
  <title>Illustrated seed avatar for ${safeName}</title>
  <desc>Panameer seed data. A flat geometric illustration generated locally from
  the persona's email address. It is not a photograph and does not depict a real
  person.</desc>
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bgTop}"/>
      <stop offset="1" stop-color="${bgBot}"/>
    </linearGradient>
    <clipPath id="clip-${id}"><circle cx="128" cy="128" r="128"/></clipPath>
  </defs>
  <g clip-path="url(#clip-${id})">
    <rect width="256" height="256" fill="url(#bg-${id})"/>
    <path d="M40 256c0-60 38-94 88-94s88 34 88 94Z" fill="${shirt}"/>
    <rect x="114" y="140" width="28" height="34" rx="14" fill="${skin}"/>
    <circle cx="128" cy="112" r="46" fill="${skin}"/>
    ${hairPath(style, hair)}
    <circle cx="112" cy="110" r="4.5" fill="#2B2118"/>
    <circle cx="144" cy="110" r="4.5" fill="#2B2118"/>
    <path d="M116 132c7 6 17 6 24 0" stroke="#2B2118" stroke-width="4"
          stroke-linecap="round" fill="none"/>
  </g>
</svg>
`;
}
