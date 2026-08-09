/**
 * WHICH SIDE OF THE MARKETPLACE A PAGE IS TALKING TO (E051).
 *
 * Two pages, one per side: the buyer page at `/` and the seller page at
 * `/for-providers`. The toggle in each hero moves between them.
 *
 * THE AUDIENCE IS THE ROUTE, NOT A PIECE OF STATE. That is the whole design and
 * it is worth saying plainly, because the obvious implementation — one page, a
 * client toggle, conditional copy — is the thing this replaces. Deriving it
 * from the URL means every variant is server-rendered and indexable, a buyer
 * can be sent a link that stays a buyer page, the back button works, and no
 * section has to know how to be two things at once.
 *
 * WHAT IS ITERABLE AND WHAT IS NOT. Scott's invariant is the fork. The toggle's
 * visual treatment is a starting point and expected to change — which is
 * exactly why the mapping between audience and route lives here rather than
 * inside the toggle component. Redesigning the control does not touch routing.
 */

export type Audience = "neutral" | "buyer" | "provider";

/*
  ⚠ BUYER IS `/` NOW (brief_home_rebuild_08_09). It was /for-buyers, with `/`
  as a third, neutral landing that forked between the two. The rebuild removes
  the fork: the buyer page IS the root, because buyers are the default audience
  and a marketplace that greets everyone with "which are you?" spends its best
  screen asking instead of selling.

  `neutral` is kept in the type but now resolves to the buyer page, since that
  is what the root serves. Nothing should be passing it after WS-E.
*/
export const AUDIENCE_PATH: Record<Audience, string> = {
  neutral: "/",
  buyer: "/",
  provider: "/for-providers",
};

/**
 * The toggle's two options, in the order they render.
 *
 * Buyer first: the combined landing's own hero leads with hiring, and a control
 * whose first option contradicts the page above it is a control people read
 * twice.
 */
export const AUDIENCE_CHOICES: {
  audience: Exclude<Audience, "neutral">;
  label: string;
  /** The one-line reason to pick this side, used by the fork chooser. */
  blurb: string;
}[] = [
  {
    audience: "buyer",
    label: "Hire an Expert",
    blurb:
      "Find vetted Enterprise Systems and AI experts, buy work in a fixed-price package, or connect your ERP and order services without leaving it.",
  },
  {
    audience: "provider",
    label: "Work & Earn",
    blurb:
      "Learn the applications free, build a profile buyers can find, and get paid for the work you already do best.",
  },
];
