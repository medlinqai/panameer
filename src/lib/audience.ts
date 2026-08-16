/**
 * WHICH SIDE OF THE MARKETPLACE A PAGE IS TALKING TO (E051).
 *
 * Two pages, one per side: the buyer page at `/` and the seller page at
 * `/find-work` (renamed from `/for-providers`, E029). The toggle in each hero
 * moves between them.
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
  provider: "/find-work",
};

// ---------------------------------------------------------------------------
// THREE PUBLIC PAGES (brief_public_pages_ia WS-4).
//
// `Audience` above is about VOICE — does this section speak to a buyer or a
// seller — and sections keep using it. This is about ROUTING: which of the
// three public pages is on screen. They are deliberately separate concepts,
// because the home and Hire Talent are both buyer-voiced but are different
// destinations with different jobs, and collapsing the two would force the
// switch to treat them as one place.
// ---------------------------------------------------------------------------

export type PublicPage = "home" | "hire" | "work";

export const PUBLIC_PAGES: {
  key: PublicPage;
  href: string;
  /** What the switch calls it — the visitor's job, not our label for them. */
  label: string;
  /** Which voice the page's sections speak in. */
  audience: Audience;
}[] = [
  { key: "home", href: "/", label: "See where I stand", audience: "buyer" },
  { key: "hire", href: "/hire-talent", label: "I want to hire", audience: "buyer" },
  { key: "work", href: "/find-work", label: "I want to work", audience: "provider" },
];

export const publicPageHref = (key: PublicPage) =>
  PUBLIC_PAGES.find((p) => p.key === key)!.href;
