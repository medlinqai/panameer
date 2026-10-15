import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { StartPage } from "@/components/onboarding/StartPage";
import { displayFirstName } from "@/lib/display";
import {
  REQUESTER_STEP_LABELS,
  REQUESTER_WORK_STEPS,
} from "@/lib/requester-steps";

// BC-E001: Buyer · Company · Location.
const CARDS: Record<(typeof REQUESTER_WORK_STEPS)[number], { title: string; blurb: string }> = {
  requester_info: { title: REQUESTER_STEP_LABELS.requester_info, blurb: "Who you are, and how providers reach you." },
  company: { title: REQUESTER_STEP_LABELS.company, blurb: "Your company, its industry and invoice email." },
  work_location: { title: REQUESTER_STEP_LABELS.work_location, blurb: "Your company's addresses and where you work." },
};

export default async function RequesterStartPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/requester/start");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      user: { select: { email_verified: true } },
      requesterProfile: { select: { id: true, completed_at: true } },
    },
  });

  // Not a requester → let /join sort out where they belong.
  if (!person?.requesterProfile) redirect("/join");
  // Still unverified → the pre-verify page owns the gate.
  if (!person.user?.email_verified) redirect("/join/requester");
  // Already finished → the ready state, not a second run at the intro.
  if (person.requesterProfile.completed_at) redirect("/join/requester/ready");

  return (
    <StartPage
      headline={`Hey ${displayFirstName(person.first_name)}. Let's get you set up to buy.`}
      lead="Tell us who you are, your company, and where the work happens. Then shop services and products, or post a job."
      icon="people"
      cards={REQUESTER_WORK_STEPS.map((step) => CARDS[step])}
      footnote="It takes about 3 minutes and you can edit it later. We'll save as you go."
      href="/join/requester/steps"
    />
  );
}
