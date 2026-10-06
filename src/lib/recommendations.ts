import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { sendEmail } from "@/lib/resend";
import { recommendationRequestTemplate } from "@/lib/email/templates/recommendation-request";
import { displayFullName } from "@/lib/display";

/** 30 days. A busy former client will not answer within 24 hours. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** One live ask per contact address. Re-asking is a re-send, not a second row. */
export class RecommendationError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_A_PROVIDER"
      | "INVALID"
      | "EXPIRED"
      | "ALREADY_ANSWERED"
      | "RATE_LIMITED"
  ) {
    super(message);
    this.name = "RecommendationError";
  }
}

/** The boilerplate the compose box opens with (quick send). */
export function defaultMessage(providerFirstName: string): string {
  return [
    `Hi,`,
    ``,
    `I'm building out my profile on Panameer, a marketplace for Oracle Cloud and enterprise-application work. If you have a couple of minutes, would you be willing to write a short recommendation about working with me?`,
    ``,
    `Anything you write appears on my public profile, so buyers can see it when they're deciding who to work with. A few sentences is plenty.`,
    ``,
    `Thank you,`,
    providerFirstName,
  ].join("\n");
}

async function ownedProfile(viewer: Viewer) {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      person: { select: { first_name: true, last_name: true } },
    },
  });
  if (!profile) {
    throw new RecommendationError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return profile;
}

export const RECOMMENDATION_LIMIT_PER_HOUR = 5;
export const RECOMMENDATION_LIMIT_PER_DAY = 20;

/** Remaining allowance, so the UI can warn BEFORE the refusal rather than after. */
export async function recommendationAllowance(providerProfileId: string) {
  const now = Date.now();
  const [lastHour, lastDay] = await Promise.all([
    prisma.recommendationRequest.count({
      where: {
        provider_profile_id: providerProfileId,
        created_at: { gte: new Date(now - 3_600_000) },
      },
    }),
    prisma.recommendationRequest.count({
      where: {
        provider_profile_id: providerProfileId,
        created_at: { gte: new Date(now - 86_400_000) },
      },
    }),
  ]);
  return {
    hourRemaining: Math.max(0, RECOMMENDATION_LIMIT_PER_HOUR - lastHour),
    dayRemaining: Math.max(0, RECOMMENDATION_LIMIT_PER_DAY - lastDay),
  };
}

export async function requestRecommendation(
  viewer: Viewer,
  input: { contactName: string; contactEmail: string; message: string },
  opts: { origin?: string | null } = {}
): Promise<{ sent: boolean; devLink?: string; offPlatform: boolean }> {
  const profile = await ownedProfile(viewer);

  const allowance = await recommendationAllowance(profile.id);
  if (allowance.hourRemaining <= 0 || allowance.dayRemaining <= 0) {
    throw new RecommendationError(
      "You have reached the limit for recommendation requests. Try again later.",
      "RATE_LIMITED"
    );
  }

  const email = normalizeEmail(input.contactEmail);

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  const offPlatform = !existing;

  const raw = randomBytes(32).toString("hex");
  const providerName = displayFullName(
    profile.person.first_name,
    profile.person.last_name
  );

  const fields = {
    contact_name: input.contactName.trim().slice(0, 120),
    contact_off_platform: offPlatform,
    message: input.message.trim().slice(0, 4000),
    token_hash: hashToken(raw),
    status: "SENT" as const,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS),
    sent_at: new Date(),
  };

  const live = await prisma.recommendationRequest.findFirst({
    where: {
      provider_profile_id: profile.id,
      contact_email: email,
      status: "SENT",
    },
    select: { id: true },
  });

  const row = live
    ? await prisma.recommendationRequest.update({
        where: { id: live.id },
        data: fields,
      })
    : await prisma.recommendationRequest.create({
        data: {
          provider_profile_id: profile.id,
          contact_email: email,
          ...fields,
        },
      });

  const url = `${appBaseUrl(opts.origin)}/recommend/${raw}`;
  const { subject, html, text } = recommendationRequestTemplate({
    providerName,
    contactName: input.contactName.trim(),
    message: input.message.trim(),
    respondUrl: url,
    invite: offPlatform,
  });

  // NO RESEND KEY = NO SEND, and the link comes back instead. The same dev
  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text,
      template: "recommendation-request",
      subjectType: "RecommendationRequest",
      subjectId: row.id,
    });
    return { sent: true, offPlatform };
  } catch {
    await prisma.recommendationRequest.update({
      where: { id: row.id },
      data: { updated_at: new Date() },
    });
    return { sent: false, devLink: url, offPlatform };
  }
}

/** What the provider sees on their own page. Never exposes the token hash. */
/** ASK AN ACCEPTED COLLEAGUE WS-A) */
export async function requestRecommendationFromColleague(
  viewer: Viewer,
  input: { toUserId: string; message: string },
  opts: { origin?: string | null } = {}
) {
  const connection = await prisma.connection.findFirst({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [
        { from_user_id: viewer.userId, to_user_id: input.toUserId },
        { from_user_id: input.toUserId, to_user_id: viewer.userId },
      ],
    },
    select: { id: true },
  });
  if (!connection) {
    // THE SAME ANSWER WHETHER THEY ARE A STRANGER OR DECLINED YOU — a
    throw new RecommendationError(
      "You can only ask a colleague for a recommendation.",
      "INVALID"
    );
  }

  const person = await prisma.person.findFirst({
    where: { user: { is: { id: input.toUserId } } },
    select: { first_name: true, last_name: true, user: { select: { email: true } } },
  });
  if (!person?.user?.email) {
    throw new RecommendationError("That colleague has no address on file.", "INVALID");
  }

  return requestRecommendation(
    viewer,
    {
      contactName: displayFullName(person.first_name, person.last_name),
      contactEmail: person.user.email,
      message: input.message,
    },
    opts
  );
}

export async function listRecommendations(viewer: Viewer) {
  const profile = await ownedProfile(viewer);
  const rows = await prisma.recommendationRequest.findMany({
    where: { provider_profile_id: profile.id },
    orderBy: { sent_at: "desc" },
    select: {
      id: true,
      contact_name: true,
      contact_email: true,
      contact_off_platform: true,
      status: true,
      sent_at: true,
      responded_at: true,
      body: true,
      recommender_title: true,
      recommender_company: true,
    },
  });
  return {
    providerFirstName: profile.person.first_name,
    rows: rows.map((r) => ({
      ...r,
      sent_at: r.sent_at.toISOString(),
      responded_at: r.responded_at?.toISOString() ?? null,
    })),
  };
}

/** Resolve a raw token to a live request. Fails closed on every bad state. */
export async function findByToken(raw: string) {
  const row = await prisma.recommendationRequest.findUnique({
    where: { token_hash: hashToken(raw) },
    select: {
      id: true,
      contact_name: true,
      contact_off_platform: true,
      message: true,
      status: true,
      expires_at: true,
      providerProfile: {
        select: { person: { select: { first_name: true, last_name: true } } },
      },
    },
  });
  if (!row) return null;
  return row;
}

/** Record the recommendation. Single-use: a submitted row can't be rewritten. */
export async function submitRecommendation(
  raw: string,
  input: {
    body: string;
    title?: string | null;
    company?: string | null;
    ip?: string | null;
    ua?: string | null;
  }
): Promise<void> {
  const row = await prisma.recommendationRequest.findUnique({
    where: { token_hash: hashToken(raw) },
    select: {
      id: true,
      status: true,
      expires_at: true,
      // WS-D — who to tell, and who to say it was from.
      contact_name: true,
      provider_profile_id: true,
    },
  });
  if (!row) throw new RecommendationError("That link isn't valid.", "INVALID");
  if (row.status !== "SENT") {
    throw new RecommendationError("That link has already been used.", "ALREADY_ANSWERED");
  }
  if (row.expires_at < new Date()) {
    await prisma.recommendationRequest.update({
      where: { id: row.id },
      data: { status: "EXPIRED" },
    });
    throw new RecommendationError("That link has expired.", "EXPIRED");
  }

  await prisma.recommendationRequest.update({
    where: { id: row.id },
    data: {
      status: "SUBMITTED",
      responded_at: new Date(),
      body: input.body.trim().slice(0, 2000),
      recommender_title: input.title?.trim().slice(0, 160) || null,
      recommender_company: input.company?.trim().slice(0, 160) || null,
      responder_ip: input.ip ?? null,
      responder_ua: input.ua?.slice(0, 400) ?? null,
    },
  });

  // Super run 4 lane 4 found 15 registry events nothing fires, and this is
  try {
    const owner = await prisma.providerProfile.findUnique({
      where: { id: row.provider_profile_id },
      select: { person_id: true },
    });
    if (!owner) return;
    const { notify } = await import("@/lib/notifications");
    await notify({
      event: "recommendation.received",
      personId: owner.person_id,
      // The recommender PUT THEIR NAME TO THIS — it is a public testimonial
      vars: { fromName: row.contact_name || "Someone" },
      dedupeKey: `recommendation:${row.id}`,
    });
  } catch (e) {
    console.error("[recommendations] could not record a notification:", e);
  }
}

/** Decline, recorded rather than ignored — a non-answer is an answer. */
export async function declineRecommendation(raw: string): Promise<void> {
  const row = await prisma.recommendationRequest.findUnique({
    where: { token_hash: hashToken(raw) },
    select: { id: true, status: true },
  });
  if (!row || row.status !== "SENT") return;
  await prisma.recommendationRequest.update({
    where: { id: row.id },
    data: { status: "DECLINED", responded_at: new Date() },
  });
}

/** The public RECOMMENDATIONS for a profile. */
export async function publicTestimonials(profileId: string) {
  const rows = await prisma.recommendationRequest.findMany({
    where: { provider_profile_id: profileId, status: "SUBMITTED" },
    orderBy: { responded_at: "desc" },
    select: {
      id: true,
      contact_name: true,
      recommender_title: true,
      recommender_company: true,
      body: true,
      responded_at: true,
    },
  });
  return rows
    .filter((r) => !!r.body)
    .map((r) => ({
      id: r.id,
      author: r.contact_name,
      title: r.recommender_title,
      company: r.recommender_company,
      body: r.body as string,
      at: r.responded_at?.toISOString() ?? null,
    }));
}

/** One published recommendation, as the profile renders it. */
export type Testimonial = Awaited<ReturnType<typeof publicTestimonials>>[number];
