import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { accountStandingLines, accountStandingSummary } from "@/lib/account-standing";

export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      status: true,
      person: { select: { user: { select: { email_verified: true } } } },
    },
  });

  if (!profile) {
    return NextResponse.json({ scorePercent: null, account: null });
  }

  const input = await buildCompletenessInput(profile.id);
  const score = input ? computeProfileScore(input) : null;

  const standing = accountStandingLines({
    status: profile.status,
    emailVerified: !!profile.person.user?.email_verified,
  });

  return NextResponse.json({
    scorePercent: score ? score.total : null,
    account: accountStandingSummary(standing),
  });
}
