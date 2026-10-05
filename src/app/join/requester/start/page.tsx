import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { StartPage } from "@/components/onboarding/StartPage";
import { displayFirstName } from "@/lib/display";
import {
  REQUESTER_STEP_LABELS,
  REQUESTER_WORK_STEPS,
} from "@/lib/requester-steps";

const CARD_BLURBS: Record<(typeof REQUESTER_WORK_STEPS)[number], string> = {
  requester_info: "Who you are, and how a provider reaches you.",
  work_location: "The location providers deliver to.",
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
      headline={`Hey ${displayFirstName(person.first_name)}. Ready to find the world's best talent?`}
      lead="Tell us who you are and where the work happens — then post your first work request."
      icon="people"
      cards={REQUESTER_WORK_STEPS.map((step) => ({ title: REQUESTER_STEP_LABELS[step], blurb: CARD_BLURBS[step] }))}
      footnote="It takes about 3 minutes and you can edit it later. We'll save as you go."
      href="/join/requester/steps"
    />
  );
}
