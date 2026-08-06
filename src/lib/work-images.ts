/**
 * Decorative photos for work-request cards (brief_work_card_images).
 *
 * STOCK, NOT THE CLIENT. These say nothing about the buyer, the job or the
 * people on it — they exist so a card reads as a finished thing rather than a
 * grey rectangle. That is why the alt text is generic: describing the person in
 * the photo would imply the picture means something.
 *
 * ORDER IS LOAD-BEARING. The assignment indexes into this array, so reordering
 * or removing an entry silently repaints every existing job with a different
 * photo. Append new images at the END; the assignment is stable only as long as
 * the list is.
 */
export const WORK_CARD_IMAGES = [
  "/work-images/man-in-sweater.jpg",
  "/work-images/woman-at-desk.jpg",
  "/work-images/woman-on-bench.jpg",
  "/work-images/woman-with-coffee.jpg",
  "/work-images/man-on-couch.jpg",
  "/work-images/startup-team.jpg",
  "/work-images/student-at-laptop.jpg",
  "/work-images/engineer-at-work.jpg",
  "/work-images/woman-at-whiteboard.jpg",
] as const;

/** Generic on purpose — see the note above. */
export const WORK_CARD_IMAGE_ALT = "Work opportunity";

/**
 * FNV-1a, 32-bit. A hash, not `Math.random()` and not the id's char codes
 * summed: ids are cuids that share a long common prefix and differ in their
 * tail, so anything without avalanche clusters most of them onto one or two
 * photos. FNV-1a is four lines and spreads them evenly.
 *
 * `>>> 0` after each round keeps the running value an unsigned 32-bit int —
 * without it the multiply pushes past 2^31, JavaScript's bitwise ops hand back
 * a negative number, and the modulo below returns a negative index.
 */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The photo for a work request — the SAME one every time, for a given id.
 *
 * Derived from the id rather than stored, so it costs no column and no
 * migration, and it cannot drift between the card in a feed and the card on a
 * detail page. A per-render random pick would change the photo on every reload,
 * which reads as the page being broken.
 */
export function workCardImage(id: string): string {
  return WORK_CARD_IMAGES[hash32(id) % WORK_CARD_IMAGES.length];
}
