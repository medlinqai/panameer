import { connectInviteTemplate } from "@/lib/email/templates/connect-invite";

// Invite to someone not yet on Panameer — the shared connect email (rewritten 2026-10-05, no pitch block).
export function colleagueInviteTemplate({
  inviterName,
  inviterFirstName,
  inviterTitle,
  inviterCompany,
  companyUrl,
  inviteeName,
  message,
  profileUrl,
  joinUrl,
}: {
  inviterName: string;
  inviterFirstName?: string | null;
  inviterTitle?: string | null;
  inviterCompany?: string | null;
  companyUrl?: string | null;
  inviteeName?: string | null;
  message?: string | null;
  /** The inviter's public profile; falls back to the invitation page. */
  profileUrl?: string | null;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  return connectInviteTemplate({
    fromName: inviterName,
    fromFirstName: inviterFirstName,
    fromTitle: inviterTitle,
    fromCompany: inviterCompany,
    companyUrl,
    note: message,
    recipientFirstName: inviteeName,
    profileUrl: profileUrl || joinUrl,
    acceptUrl: joinUrl,
  });
}
