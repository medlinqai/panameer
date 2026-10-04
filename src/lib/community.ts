// import { PROVIDER_NAV } from "@/lib/nav";

export type CommunitySection = {
  label: string;
  href: string;
  blurb: string;
  state: "live" | "early";
};

// const BLURBS: Record<string, { blurb: string; state: CommunitySection["state"] }> = {
//   "/messages": {
//     blurb:
//       "Direct conversations with buyers and the people you work with.",
//     state: "early",
//   },
//   "/community/groups": {
//     blurb:
//          SENTENCE REMOVED, NOT REWRITTEN — the blurb read *"Ask questions, answer
//          them, and be seen doing it. Posting earns Community Credits."* What is
//          left is the original first sentence, untouched. NO NEW COPY WAS WRITTEN. */
//       "Ask questions, answer them, and be seen doing it.",
//     state: "live",
//   },
//   "/community/teams": {
//     blurb:
//       "The providers you represent, and the recruiter who represents you.",
//     state: "live",
//   },
//   "/community/mentors": {
//     blurb:
//       "Senior practitioners offering 15-minute sessions — the fastest way to unblock something.",
//     state: "early",
//   },
// };

// export function communitySections(): CommunitySection[] {
//   const community = PROVIDER_NAV.find((i) => i.href === "/community");
//   return (community?.children ?? []).map((child) => ({
//     label: child.label,
//     href: child.href,
//     blurb: BLURBS[child.href]?.blurb ?? "",
//     state: BLURBS[child.href]?.state ?? "early",
//   }));
// }

// export const CREDIT_EARN_ACTIONS: { action: string; detail: string }[] = [
//   {
//     action: "Finish your profile",
//     detail: "A complete profile earns a one-off grant — and gets you found.",
//   },
//   {
//     action: "Complete a course",
//     detail: "Every Learn course you finish pays out once.",
//   },
//   {
//     action: "Answer in the forums",
//     detail: "Posting and replying earns a little back each time.",
//   },
//   {
//     action: "Respond to work requests",
//     detail: "Replying to a buyer's request earns, whether or not you win it.",
//   },
//   {
//     action: "Bring someone in",
//     detail: "When a person you invited signs up, you both benefit.",
//   },
// ];
//
// export const CREDIT_SPEND_ACTIONS: { action: string; detail: string }[] = [
//   {
//     action: "A seat at a Friday group session",
//     detail:
//       "Thirty minutes with a senior practitioner, one-to-many. Seats are earned, not sold.",
//   },
// ];
//