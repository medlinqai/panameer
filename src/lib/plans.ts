/**
 * The provider membership ladder (J2.4 WS-G / E013).
 *
 * PROVIDER BASIC / PLUS / PRO — Panameer's names. What this replaces spoke about
 * a "freelance career" and priced a competitor's tiers; both are gone.
 *
 * NO CONNECTS ANYWHERE. Not as a tile, not as an allowance, not as a line in a
 * feature list. That is the standing decision and this is the file where a
 * "50 Connects/month" bullet would most naturally have crept back in.
 *
 * PRICES ARE DECLARED, BILLING IS NOT WIRED. The brief defers the payment
 * processor, so `Manage Membership` captures intent and says so rather than
 * pretending to charge a card. Stating a price we cannot yet take is honest;
 * showing a checkout that does nothing is not.
 */
export type PlanTier = "Basic" | "Plus" | "Pro";

export type PlanDefinition = {
  tier: PlanTier;
  price: string;
  cadence: string;
  tagline: string;
  /** Marked on the card, at most one. */
  popular?: boolean;
  features: string[];
  /** What this tier adds that the one below it doesn't have. */
  unavailable?: string[];
};

export const PLANS: PlanDefinition[] = [
  {
    tier: "Basic",
    price: "Free",
    cadence: "",
    tagline: "Everything you need to be found and to win work.",
    features: [
      "Public marketplace profile",
      "Unlimited service products",
      "Résumé import and AI profile build",
      "Free access to Panameer Learn",
      "Messages with buyers",
    ],
    /*
      ── ⚠⚠⚠ `Validation contact requests` WAS NEVER UNAVAILABLE (`P2-A1.1-E734`) ──

      ⚠ **MEASURED: `requestValidation` (`profile-settings.ts:233`) and
      `requestProjectValidation` (`project-validation.ts:63`) contain NO `isPlus` check.**
      Their gates are ownership, a client-domain match and a resend cooldown. ⚠⚠ **EVERY
      BASIC PROVIDER CAN ALREADY DO IT**, and this list told them they could not.
      ⚠⚠⚠ **A PAYWALL ON A FEATURE THAT IS NOT WALLED IS WORSE THAN A MISSING FEATURE** —
      it stops people using something that is already theirs.

      ⚠ The other two stay: `earnings_private` and priority placement really are absent
      from Basic — because they are absent from EVERYTHING. See the Plus block below.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   unavailable: [
      //     "Earnings privacy controls",
      //     "Validation contact requests",
      //     "Priority placement in buyer search",
      //   ],
    */
    unavailable: ["Earnings privacy controls"],
  },
  {
    tier: "Plus",
    price: "$19.99",
    cadence: "per month",
    popular: true,
    tagline: "For providers actively bidding, who want an edge in search.",
    /*
      ── ⚠⚠⚠ THIS CARD SOLD THREE THINGS THAT DO NOT EXIST (`P2-A1.1-E734`) ──────

      ⚠ **SCOTT, 2026-10-01, answers 13 and 14: the plans page shows only what is true,
      and *"who viewed you"* comes off it.**

      ⚠⚠ **MEASURED, FEATURE BY FEATURE:**
        · ⚠⚠⚠ **`Profile insight: who viewed you, and when` — NOT BUILT, AND THE APP SAYS
          THE OPPOSITE ON ANOTHER PAGE.** `profile-views.ts:34-38` rules it out in as many
          words — *"STORE WHO, SHOW THE COUNT… SHOWING WHO IS NAMED OUT OF SCOPE"* — and
          `StatisticsCards.tsx:135` tells members **"We never show you who."** ⚠ One
          product promising and refusing the same thing on two screens. **REMOVED.**
        · ⚠ **`Priority placement in buyer search` — NOT BUILT.** It is a string here and
          nowhere else; no ranking path reads a tier. The only boost in
          `work-request-match.ts` is skill-based. **REMOVED.**
        · ⚠ **`Request validation from your project contacts` — BUILT, AND ALREADY FREE.**
          It is not a Plus feature at all. **REMOVED** (and taken off Basic's
          `unavailable` list above, where it was actively misleading).
        · ⚠ **`Earnings privacy` — the column exists and NOTHING READS OR WRITES IT.** Its
          form is unmounted (`settings/profile` is now a redirect) and the route accepts
          the field with **no server-side `isPlus` check at all**. ⚠⚠ **KEPT, BECAUSE IT IS
          THE ONLY THING LEFT THAT NAMES WHAT PLUS IS FOR** — and flagged, because selling
          it today would be selling dead code.

      ⚠⚠⚠ **AND THE STRUCTURAL FACT BEHIND ALL OF IT: NO PROVIDER CAN EVER BE PLUS.**
      `viewerIsPlus` (`lib/plus.ts:24`) reads **`BuyerProfile.subscription_tier`** — a
      BUYER-COMPANY tier — and `membership.ts:7-13` records that there is no provider tier
      column. `/settings/membership` hard-codes `"Basic"` for everyone. ⚠ So this card is
      sold to an audience that cannot buy it. **THAT IS SCOTT'S TO RULE ON AND IS NOT
      FIXED HERE.**
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   "Everything in Basic",
      //   "Earnings privacy — hide your rate history from buyers",
      //   "Request validation from your project contacts",
      //   "Priority placement in buyer search",
      //   "Profile insight: who viewed you, and when",
    */
    features: [
      "Everything in Basic",
      "Earnings privacy — hide your rate history from buyers",
    ],
  },
  {
    tier: "Pro",
    price: "Contact us",
    cadence: "",
    tagline: "For recruiters and agencies representing several providers.",
    features: [
      "Everything in Plus",
      "Represent multiple providers under one login",
      "Team billing and consolidated withdrawals",
      "Dedicated onboarding support",
    ],
  },
];
