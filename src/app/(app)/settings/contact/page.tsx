import { guardPage } from "@/lib/guard";
import { getContactInfo } from "@/lib/settings";
import { ContactForm } from "@/components/settings/ContactForm";

export const metadata = { title: "Contact Info · Panameer" };

export default async function ContactInfoPage() {
  const viewer = await guardPage("authenticated");
  const info = await getContactInfo(viewer);
  return <ContactForm info={info} />;
}
