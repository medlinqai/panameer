"use client";

import { createContext, useContext } from "react";

/**
 * IS THIS SCENE THE CARD CROP, OR THE REAL THING?
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 * Every scene is rendered TWICE from one element: clipped inside the card, and
 * live inside the lightbox. The card is a real `<button aria-haspopup="dialog">`
 * — that is the accessibility requirement, not a style choice — and HTML's
 * button content model forbids interactive descendants. A `<button>` inside a
 * `<button>` is a hydration error:
 *
 *     In HTML, <button> cannot be a descendant of <button>.
 *
 * It is also a real defect underneath the warning. The crop is `aria-hidden`
 * and `pointer-events:none`, so a control in there is unreachable by pointer,
 * hidden from assistive tech, and yet still in the tab order — a focus stop
 * that lands on nothing. And a nested button swallows Enter/Space, so the card
 * silently stops opening for keyboard users.
 *
 * ── WHY A CONTEXT AND NOT A PROP ─────────────────────────────────────────────
 *
 * `EXAMPLES` holds each scene as one `ReactNode`, and the same element object is
 * handed to both the crop and the dialog. React elements are immutable
 * descriptions, so the two renders are independent instances — each reads the
 * context around it. Threading a prop instead would mean two element objects
 * per card and a second place to keep in sync.
 *
 * ── THE RULE FOR ANY FUTURE SCENE ────────────────────────────────────────────
 *
 * Nothing inside the crop is interactive. Read this flag and render the control
 * as inert chrome — same class, same box, so the crop stays pixel-identical to
 * what opening the card reveals. Do not just drop the control: the crop would
 * then show a layout the lightbox does not have.
 */
const DecorativeSceneContext = createContext(false);

export const DecorativeSceneProvider = DecorativeSceneContext.Provider;

/** True when this scene is the decorative card crop rather than the dialog. */
export function useDecorativeScene(): boolean {
  return useContext(DecorativeSceneContext);
}
