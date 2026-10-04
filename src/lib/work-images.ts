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

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function workCardImage(id: string): string {
  return WORK_CARD_IMAGES[hash32(id) % WORK_CARD_IMAGES.length];
}
