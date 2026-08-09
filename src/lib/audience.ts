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
 * THE MAPPING LIVES HERE, not in the toggle, so redesigning the control cannot
 * break routing. The labels moved to brand.ts with the rest of the copy.
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
