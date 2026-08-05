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
      "Unlimited service packages",
      "Résumé import and AI profile build",
      "Free access to Panameer Learn",
      "Messages with buyers",
    ],
    unavailable: [
      "Earnings privacy controls",
      "Validation contact requests",
      "Priority placement in buyer search",
    ],
  },
  {
    tier: "Plus",
    price: "$19.99",
    cadence: "per month",
    popular: true,
    tagline: "For providers actively bidding, who want an edge in search.",
    features: [
      "Everything in Basic",
      "Earnings privacy — hide your rate history from buyers",
      "Request validation from your project contacts",
      "Priority placement in buyer search",
      "Profile insight: who viewed you, and when",
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
