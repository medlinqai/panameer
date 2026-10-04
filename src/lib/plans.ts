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
    unavailable: ["Earnings privacy controls"],
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
