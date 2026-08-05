import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { sendEmail } from "@/lib/resend";
import { recommendationRequestTemplate } from "@/lib/email/templates/recommendation-request";
import { displayFullName } from "@/lib/display";

/**
 * REQUEST RECOMMENDATIONS (J2.4 WS-F / E012).
 *
 *   provider writes to a contact → contact gets a branded email → they write a
 *   recommendation (or decline) → it appears in the provider's Testimonials.
 *
 * Built on the project-validation infrastructure rather than beside it: same
 * 32-byte token stored as a SHA-256 hash, same 30-day TTL, same dev-link
 * fallback when Resend isn't configured. The two flows ask a contact different
 * questions but they ask them the same way, and a second token scheme would be
 * a second thing to get wrong.
 *
 * THE ACQUISITION HOOK IS CONDITIONAL. When the address doesn't belong to a
 * Panameer account, the email and the landing page invite the recipient to
 * create their own profile. When it does, they don't — recruiting somebody who
 * already signed up reads as a product that doesn't know its own users.
 */

/** 30 days. A busy former client will not answer within 24 hours. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** One live ask per contact address. Re-asking is a re-send, not a second row. */
export class RecommendationError extends Error {
  constructor(
    message: string,
    public code: "NOT_A_PROVIDER" | "INVALID" | "EXPIRED" | "ALREADY_ANSWERED"
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

/**
 * Ask a contact for a recommendation.
 *
 * OWNER-SCOPED: the profile is resolved from the session, so the row can only
 * ever be attached to the caller's own profile — nothing in the request names a
 * record.
 */
export async function requestRecommendation(
  viewer: Viewer,
  input: { contactName: string; contactEmail: string; message: string },
  opts: { origin?: string | null } = {}
): Promise<{ sent: boolean; devLink?: string; offPlatform: boolean }> {
  const profile = await ownedProfile(viewer);
  const email = normalizeEmail(input.contactEmail);

  /*
    Is this person already on Panameer? Decided HERE and stored, not computed at
    render time: the invite belongs to the moment of asking, and a contact who
    signs up next week should not retroactively change what we said to them.
  */
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

  /*
    ONE LIVE ASK PER (PROFILE, ADDRESS). A provider nudging the same contact
    again gets a fresh token on the SAME row rather than a second row the
    contact could answer independently — two testimonials from one ask is not a
    state that should be reachable.

    An UNANSWERED row is rewritten; an answered one is left alone and a new ask
    is created beside it, because a second recommendation from a contact who
    already gave one is a legitimate thing to want and overwriting their first
    would destroy it. Done as find-then-write rather than `upsert` because the
    key here is a pair with no unique constraint, and inventing one purely to
    satisfy upsert's signature would constrain the answered case too.
  */
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

  /*
    NO RESEND KEY = NO SEND, and the link comes back instead. The same dev
    affordance verify-email and project validation use (E048): the loop stays
    walkable locally rather than silently doing nothing.
  */
  try {
    await sendEmail({ to: email, subject, html, text });
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
    select: { id: true, status: true, expires_at: true },
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

/**
 * The public Testimonials for a profile.
 *
 * SUBMITTED only, and no contact address ever leaves this function — a
 * testimonial names its author and their title, not a way to email them.
 */
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
