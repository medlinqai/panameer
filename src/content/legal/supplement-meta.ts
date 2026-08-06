/**
 * Presentation for the 19 legal supplements (brief_legal_supplements WS-A/C).
 *
 * HAND-WRITTEN, beside the GENERATED `supplements.ts`. The generator owns what
 * the documents SAY; this owns what we say ABOUT them — the human title, the
 * one-line summary on the index, which group they sit in, and the notice each
 * one carries. Keeping the two apart means re-running the generator can never
 * clobber an editorial decision, and adding a document is one entry here.
 *
 * NOTICES ARE THE POINT OF THIS FILE. Several of these documents describe
 * things Panameer is still building — money movement, an escrow entity that has
 * no name yet, jurisdiction-specific obligations counsel hasn't written. Each
 * says so on its own page rather than reading as settled policy.
 */

export type SupplementNotice =
  /** Money movement Panameer is building; regulated; not wired to anything. */
  | { kind: "payments" }
  /** Jurisdiction-heavy shell — counsel completes it. */
  | { kind: "counsel" }
  /** A specific Panameer value is missing from otherwise-complete text. */
  | { kind: "todo"; what: string }
  /** The source text is unusable; the page is a placeholder instead. */
  | { kind: "stub"; body: string };

export type SupplementMeta = {
  title: string;
  summary: string;
  group: SupplementGroup;
  notice?: SupplementNotice;
};

export const GROUPS = [
  "Core agreements",
  "Buying and selling",
  "Payments and escrow",
  "Data and compliance",
  "Integration",
  "Brand",
] as const;
export type SupplementGroup = (typeof GROUPS)[number];

export const SUPPLEMENT_META: Record<string, SupplementMeta> = {
  /* ---- Buying and selling ---------------------------------------------- */
  "referral-program-terms": {
    title: "Referral Program Terms",
    summary:
      "How referral rewards work. This is the surface Community Credits attach to when the Credits ledger lands.",
    group: "Buying and selling",
  },
  "provider-membership-agreement": {
    title: "Provider Membership Agreement",
    summary: "Membership tiers for providers, and what each includes.",
    group: "Buying and selling",
    notice: {
      kind: "todo",
      what:
        "This describes PURCHASING Community Credits. Panameer's Credits are earned, not bought — the tiers and what they include need Scott's decision before this is accurate.",
    },
  },
  "optional-service-contract-terms": {
    title: "Optional Work Order Terms",
    summary:
      "Default terms two users can adopt for a Work Order — IP ownership, confidentiality, warranties — if they don't write their own.",
    group: "Buying and selling",
  },
  "any-hire-terms": {
    title: "Any Hire Terms",
    summary:
      "Engaging someone you already know through Panameer, rather than matching on the marketplace.",
    group: "Buying and selling",
  },
  "direct-contracts-terms": {
    title: "Direct Work Order Terms",
    summary:
      "Bring your own counterparty: pay a supplier you already work with through Panameer. Section 7 of the User Agreement (Non-Circumvention) is the sibling of this one.",
    group: "Buying and selling",
  },

  /* ---- Payments and escrow --------------------------------------------- */
  "payment-escrow-entity": {
    title: "Payment Escrow Entity",
    summary: "Which Panameer entity holds escrowed funds. Not yet decided.",
    group: "Payments and escrow",
    notice: {
      kind: "stub",
      body:
        "Panameer's payment entity has not been established. The source document named a specific escrow subsidiary; substituting an invented company name into a document about who holds your money would be worse than leaving it open, so the entity reads {{PANAMEER_PAYMENT_ENTITY}} until counsel names it.",
    },
  },
  "fee-and-ach-authorization": {
    title: "Fee and ACH Authorization Agreement",
    summary: "The fees Panameer charges and your authorization to debit them.",
    group: "Payments and escrow",
    notice: { kind: "payments" },
  },
  "any-hire-escrow-instructions": {
    title: "Any Hire Escrow Instructions",
    summary: "How funds are held and released on an Any Hire Work Order.",
    group: "Payments and escrow",
    notice: { kind: "payments" },
  },
  "direct-contracts-escrow-instructions": {
    title: "Direct Work Order Escrow Instructions",
    summary: "How funds are held and released on a Direct Work Order.",
    group: "Payments and escrow",
    notice: { kind: "payments" },
  },
  "fixed-price-escrow-instructions": {
    title: "Fixed-Price Escrow Instructions",
    summary: "Milestones, approval, refunds and disputes on a fixed-price Work Order.",
    group: "Payments and escrow",
    notice: { kind: "payments" },
  },
  "hourly-bonus-expense-escrow-instructions": {
    title: "Hourly, Bonus and Expense Escrow Instructions",
    summary: "Weekly billing, bonuses and expenses on an hourly Work Order.",
    group: "Payments and escrow",
    notice: { kind: "payments" },
  },

  /* ---- Data and compliance --------------------------------------------- */
  "cookie-policy": {
    title: "Cookie Policy",
    summary: "What Panameer stores on your device, and why.",
    group: "Data and compliance",
  },
  "data-processing-agreement": {
    title: "Data Processing Agreement",
    summary:
      "The controller/processor terms and Standard Contractual Clauses for customers subject to GDPR.",
    group: "Data and compliance",
    notice: { kind: "counsel" },
  },
  "digital-services-act": {
    title: "Digital Services Act Information",
    summary: "EU DSA disclosures — point of contact, transparency reporting.",
    group: "Data and compliance",
    notice: { kind: "counsel" },
  },
  "ip-infringement-reporting": {
    title: "Reporting Intellectual Property Infringement",
    summary: "How to file a DMCA notice, and how to counter one.",
    group: "Data and compliance",
    notice: {
      kind: "todo",
      what:
        "The designated DMCA agent is not settled. A DMCA safe harbour requires an agent registered with the U.S. Copyright Office, and neither that registration nor the intake form this text refers to exists yet — so the contact details below are a placeholder, not a working channel.",
    },
  },
  "nondiscrimination-statement": {
    title: "Nondiscrimination Statement",
    summary: "Panameer's position on discrimination by users of the marketplace.",
    group: "Data and compliance",
  },
  "accessibility-statement": {
    title: "Accessibility Statement",
    summary: "Panameer's accessibility commitment and how to report a barrier.",
    group: "Data and compliance",
    notice: {
      kind: "todo",
      what:
        "The WCAG conformance claim below is inherited from the source document and has not been tested against Panameer. Publishing a Level AA claim we have not audited is a claim we cannot support — the conformance level, the audit date and the reporting contact all need filling in.",
    },
  },

  /* ---- Integration ------------------------------------------------------ */
  "api-terms-of-use": {
    title: "API Terms of Use",
    summary:
      "Terms for the cXML procurement interface an ERP uses to exchange punch-out, purchase-order and invoice documents with Panameer.",
    group: "Integration",
  },

  /* ---- Brand ------------------------------------------------------------ */
  "mark-use-guidelines": {
    title: "Mark Use Guidelines",
    summary: "How to use the Panameer name and logo. Coming soon.",
    group: "Brand",
    notice: {
      kind: "stub",
      body:
        "Panameer's mark use guidelines are being written. The source document specified another company's logo, its clear-space and colour rules, and the exact spellings of its name — none of which describe Panameer's brand, and rebranding those rules verbatim would publish guidance that is simply wrong. This page will carry the real guidelines once Panameer's brand assets are finalised.",
    },
  },
};
