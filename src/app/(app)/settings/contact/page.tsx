import { guardPage } from "@/lib/guard";
import { getContactInfo } from "@/lib/settings";
import { ContactForm } from "@/components/settings/ContactForm";

/**
 * CONTACT INFO (J2.4 WS-H / E014).
 *
 * Three blocks: Account, Additional accounts, Location.
 *
 * ADDITIONAL ACCOUNTS ADD A MEMBERSHIP, NOT A LOGIN. That is the locked
 * one-login→many-memberships model made visible: "Client Account" grants a
 * Buyer membership on this same login and "Agency Account" a Recruiter one.
 * The competitor surface this replaces created a second account and a second
 * password, which is how people end up with two identities and one inbox.
 */
export const metadata = { title: "Contact Info · Panameer" };

export default async function ContactInfoPage() {
  const viewer = await guardPage("canProvideServices");
  const info = await getContactInfo(viewer);
  return <ContactForm info={info} />;
}
