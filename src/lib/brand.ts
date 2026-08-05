/**
 * Brand copy that more than one surface renders (E160, E182).
 *
 * WHY IT MOVED HERE. The tagline was exported from `app/join/page.tsx`, which
 * was fine while `/join` was the only thing rendering it. E182 puts it in the
 * onboarding header, and the header is inside `OnboardingFrame` — a component
 * that `/join` itself renders. Importing the constant back out of the page
 * would have been a genuine import cycle, so the copy moves to a module with no
 * dependencies of its own and both sides import from here.
 */

/**
 * THE TAGLINE, in one constant.
 *
 * It is TEXT beside the mark, never baked into the image: a wordmark carrying a
 * sentence can't be used anywhere else, and it can't be re-worded without a
 * trip to a design tool. One constant because a tagline repeated in three files
 * becomes three different taglines.
 */
export const PANAMEER_TAGLINE =
  "The Oracle Cloud Talent, Training & Services Marketplace";
