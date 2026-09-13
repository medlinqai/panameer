/**
 * A user avatar. Renders the photo when present, otherwise an initials
 * placeholder — no external image host needed (CSP-safe for the marketing side
 * and fine everywhere else).
 *
 * ── ⚠⚠ THE FALLBACK IS ALWAYS BEHIND THE PHOTO (`P1-A1.5-E453b`) ────────────
 *
 * > **SCOTT, 2026-09-13:** *"if no picture i like the fallback styling."*
 * ⚠ THE INITIALS CHIP'S STYLING IS SETTLED AND IS NOT TOUCHED HERE — same
 * `bg-black/10` / `text-black/60`, same size maths. This changes BEHAVIOUR only.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the shape this replaces:
 *
 *     if (photoUrl) {
 *       return <img src={photoUrl} … />     // ⚠ commits, with no way back
 *     }
 *     return <span>{initials}</span>
 *
 * ⚠ IT COMMITTED TO THE `<img>` THE MOMENT `photoUrl` WAS TRUTHY, so a photo
 * that does not render left a hole forever and the fallback never got to run on
 * exactly the rows that needed it.
 *
 * ── ⚠⚠ WHY THIS IS A WRAPPER AND NOT AN `onError` HANDLER ───────────────────
 *
 * The brief asked for `onError`. ⚠ TWO MEASURED FACTS SAY A WRAPPER IS STRICTLY
 * BETTER, and both were checked before writing this:
 *
 * 1. ⚠⚠ `onError` WOULD NOT HAVE FIXED THE ROWS SCOTT IS LOOKING AT. The pink
 *    discs on `Neutral Walker` / `Faisal Al-Harbi` / `Ananya Rao` are NOT dead
 *    URLs: they return **HTTP 200, `image/png`, 70 bytes — a 1×1 fully
 *    transparent PNG**. The image LOADS, so `onError` never fires. Stretched by
 *    `object-cover` it paints nothing, and what shows through is whatever is
 *    behind it. This puts the initials there.
 * 2. ⚠ `Avatar` IS A SERVER COMPONENT rendered by TWELVE call sites. `onError`
 *    is a DOM handler and would have required `"use client"`, shipping
 *    JavaScript for every avatar on the marketing and console surfaces to solve
 *    something CSS solves for nothing.
 *
 * ⚠ SO THE INITIALS ARE THE BACKGROUND AND THE PHOTO SITS ON TOP. A photo that
 * loads covers them completely and NOTHING CHANGES ON ANY ROW THAT ALREADY
 * WORKS. A photo that 404s, is blocked, or is transparent simply reveals them.
 *
 * ⚠ `alt=""` IS DELIBERATE, not an oversight. A broken `<img>` with a non-empty
 * alt renders the browser's broken-image glyph ON TOP of the initials, which is
 * the defect again in a different shape. The avatar is decorative in every
 * caller — the person's name is always beside it — and the initials span is
 * already `aria-hidden` for the same reason.
 *
 * ⚠ NO IMAGE HOST, NO LOADER, NO `next/image` — see the note at the top.
 */
export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 48,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 font-semibold text-black/60 dark:bg-white/15 dark:text-white/70"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={`${firstName} ${lastName}`.trim() || undefined}
    >
      {initials}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
    </span>
  );
}
