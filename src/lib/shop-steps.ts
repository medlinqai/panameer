
export type ShopStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  summary: string;
  description: string;
};

export const SHOP_STEPS: ShopStepLabel[] = [
  {
    n: 1,
    summary: "Shop Service Products",
    description:
      "A service product is a fixed scope at a price its expert has already published, so the number is settled before the conversation starts.",
  },
  {
    n: 2,
    summary: "Make Offer to Buy",
    description:
      "You offer against that published price instead of bidding for it, which is the whole of what separates buying a product from commissioning work.",
  },
  {
    n: 3,
    summary: "Accept Work Order",
    description:
      "The accepted offer becomes the work order — the one agreement every pathway on Panameer converges on, however the price was reached.",
  },
  {
    n: 4,
    summary: "Approve Payment Request",
    description:
      "Delivered work is claimed against that order, and nothing is invoiced until you approve the claim.",
  },
  {
    n: 5,
    summary: "Pay Panameer",
    description:
      "One approved claim becomes one invoice from Panameer — the same settlement the bid pathway ends on, because there is only one.",
  },
];

export const SHOP_SPINE_HEADING = "Here's How It Works";

export const SHOP_CTA_LABEL = "Shop Service Products";

export const SERVICE_PRODUCTS_EXPLAINED_LABEL = "What are Service Products?";
