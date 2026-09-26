import { guardPage } from "@/lib/guard";
import { getContactInfo } from "@/lib/settings";
import { ContactForm } from "@/components/settings/ContactForm";

/**
 * CONTACT INFO (J2.4 WS-H / E014).
 *
 * ⚠⚠ TWO blocks now: Account and Location (ruling 81).
 *
 * ⚠ SCOTT, 2026-09-25: this page was *"confusing. Looks like more contact
 * details… should just be phone and email?"* — so **Additional Accounts is
 * deleted.** Provider / Client / Agency memberships are not contact detail.
 * ⚠⚠ **THE MODEL IT DESCRIBED IS NOT RETIRED, ONLY THIS RENDER OF IT.** The
 * locked one-login→many-memberships design still stands; it simply has no
 * surface on the Contact page.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   Three blocks: Account, Additional accounts, Location.
 * //   ADDITIONAL ACCOUNTS ADD A MEMBERSHIP, NOT A LOGIN. That is the locked
 * //   one-login→many-memberships model made visible … The competitor surface
 * //   this replaces created a second account and a second password, which is
 * //   how people end up with two identities and one inbox.
 */
export const metadata = { title: "Contact Info · Panameer" };

export default async function ContactInfoPage() {
  /* ⚠ `authenticated` (`P2-J1.1-E046`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. One of three layers; see
     `settings/layout.tsx` and `route-access.ts`. Scott opened the tree whole. */
  const viewer = await guardPage("authenticated");
  const info = await getContactInfo(viewer);
  return <ContactForm info={info} />;
}
