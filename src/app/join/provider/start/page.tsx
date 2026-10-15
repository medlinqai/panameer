import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { StartPage } from "@/components/onboarding/StartPage";
import { displayFirstName } from "@/lib/display";
import { sellerRegistration } from "@/lib/seller-registration";

// SO-E002: the seller's registration start page — the buyer's /join/requester/start with seller words.
const CARDS = [
  { title: "Seller", blurb: "Who you are, and how buyers reach you." },
  { title: "Company", blurb: "Your company, what it does and its industry." },
  { title: "Locations", blurb: "Your company's addresses and where you work." },
];

export default async function SellerStartPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/provider/start");
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true, first_name: true, user: { select: { email_verified: true } }, providerProfile: { select: { id: true } } },
  });
  if (!person?.providerProfile) redirect("/join");
  if (!person.user?.email_verified) redirect("/join/provider");
  const reg = await sellerRegistration(person.id);
  if (reg.registered) redirect("/dashboard");
  return (
    <StartPage
      headline={`Hey ${displayFirstName(person.first_name)}. Let's get you set up to sell.`}
      lead="Tell us who you are, who your company is, and where the work happens. Then build your profile and catalog."
      icon="people"
      cards={CARDS}
      footnote="It takes about 3 minutes and you can edit it later. We'll save as you go."
      href="/join/provider/register"
    />
  );
}
