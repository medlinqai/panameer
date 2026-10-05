import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { StartPage } from "@/components/onboarding/StartPage";
import { displayFirstName } from "@/lib/display";
import { stepsForProfile, type ProviderStep } from "@/lib/onboarding";

// Seller start page matches the buyer's (Scott 2026-10-05). TestimonialCarousel stays on disk, unused here.
const CARDS: Partial<Record<ProviderStep, { title: string; blurb: string }>> = {
  tell_us: { title: "Your Résumé", blurb: "Upload it and we fill in the rest, or type it yourself." },
  title: { title: "Your Title", blurb: "What you do, in one line clients search for." },
  roles: { title: "Your Roles", blurb: "The kinds of work you take on." },
  skills: { title: "Your Skills", blurb: "What you want to be found for." },
  rate: { title: "Your Rates", blurb: "Onsite and Offsite — what you charge." },
  picture: { title: "Your Photo", blurb: "A face and a few details clients trust." },
};

export default async function GetStartedPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/provider/start");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      is_service_provider: true,
      user: { select: { email_verified: true } },
      providerProfile: { select: { id: true, work_method: true } },
    },
  });

  // Not a provider (or no profile) → let /join sort out where they belong.
  if (!person?.is_service_provider || !person.providerProfile) redirect("/join");
  // Still unverified → the wizard owns the verify gate.
  if (!person.user?.email_verified) redirect("/join/provider");

  // One count everywhere: Résumé first, then the member's own itinerary (Review is not a step).
  const cards = (["tell_us", ...stepsForProfile(person.providerProfile)] as ProviderStep[])
    .filter((s) => s !== "finish")
    .map((s) => CARDS[s])
    .filter((c): c is { title: string; blurb: string } => !!c);

  return (
    <StartPage
      headline={`Hey ${displayFirstName(person.first_name)}. Ready for the work to find you?`}
      lead="Tell us what you do and what you charge — then publish your profile."
      icon="person"
      cards={cards}
      footnote="It takes about 3–5 minutes and you can edit it later. We'll save as you go."
      href="/join/provider"
    />
  );
}
