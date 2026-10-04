
export const HOME_OPTIMIZE_CTA = "Start Optimizing My Business Now";
export const HOME_LEARN_CTA = "Start Learning Now";
export const HOME_TALENT_CTA = "Sell More Time Now";
export const HOME_SHOP_CTA = "Shop for Service Products Now";
export const HOME_WORK_CTA = "Create A Work Request Now";
export const HOME_INTEGRATE_CTA = "Integrate with Panameer’s AIP";

export type HomeSection = {
  /** Stable key, also the `id` on the band. */
  key: string;
  eyebrow: string;
  /** Two-part headline: `b` is rendered on its own line when present. */
  headline: { a: string; b?: string };
  body: string;
  chipsTitle: string;
  chips: string[];
  ctaLabel: string;
  ctaHref: string | null;
  /** The menu page. All six exist and are public. */
  learnMoreHref: string;
};

export const HOME_SECTIONS: HomeSection[] = [
  {
    key: "optimize",
    eyebrow: "See Your Options - Build Your Roadmap",
    headline: { a: "Optimize Your Business with AI" },
    body:
      "Click the button below, answer several questions, and submit your answers. " +
      "Panameer builds your AI Optimization Dashboard (listing the possible " +
      "solutions for your organization) within minutes and sends you the link. " +
      "Access the dashboard, review the solutions, and click the button to " +
      "schedule a meeting with our expert. Together, we select and prioritize the " +
      "options that are right for your organization, creating your immediate AI " +
      "Roadmap - all for free. You can even hire from within the dashboard and " +
      "track the deployment from within Panameer.",
    chipsTitle: "What you get",
    chips: [
      "Free Process-Based Optimization Dashboard",
      "Free AI Solution Options for Your Business",
      "Free AI Roadmap with the Expert to Review It",
      "Free Deployment Tracker from w/in Work Order",
      "Create Free Roadmaps for Other Business Processes",
    ],
    ctaLabel: HOME_OPTIMIZE_CTA,
    ctaHref: "/assess",
    learnMoreHref: "/optimize",
  },
  {
    key: "learn",
    eyebrow: "The Support You Need...to Increase Your Income",
    headline: { a: "Learn Skills & Build Your Network" },
    body:
      "Click the button below and join Panameer. Enroll in a learning path and " +
      "connect with its community and/or the expert who created that learning path. " +
      "Take its courses, watch its lessons — all for free. When done, take the " +
      "certification test and post to your resume/socials. Collaborate with your " +
      "community while working.",
    chipsTitle: "What you get",
    chips: [
      "Free Access to Learning Paths & Courses",
      "Free Access to Learning Path Communities",
      "Ability to Connect with Instructors for Free",
      "Free Access to Learning Path Certifications",
    ],
    ctaLabel: HOME_LEARN_CTA,
    ctaHref: "/learn/paths",
    learnMoreHref: "/training",
  },
  {
    key: "talent",
    eyebrow: "The Talent You Need...When you need it",
    headline: { a: "Sell More Time by Shaping It to Client Needs" },
    body:
      "Clients need expert help at different inflection points and for different " +
      "durations during the deployment lifecycle. Click the button below, upload your " +
      "resume, and use AI to create your profile in seconds. Offer your expertise in " +
      "one or multi-day consultations, monthly retainers as well as long term time " +
      "and expense work. Both parties are incentivized to create better incomes and " +
      "better outcomes.",
    chipsTitle: "What you get",
    chips: [
      "Ability to Sell 1 Week Project Planning Consults",
      "Ability to Sell One-Day App Demos",
      "Ability to Sell Monthly/Quarterly Retainers",
      "Ability to Sell RFP Sales Assistance",
    ],
    ctaLabel: HOME_TALENT_CTA,
    ctaHref: "/join",
    learnMoreHref: "/talent",
  },
  {
    key: "shop",
    eyebrow: "Deploy cheaper and faster…with less risk",
    headline: { a: "Lower Costs & Risk - Buy Outcomes Not Hours" },
    body:
      "Our experts repackage their past efforts and sell them as Service Products. " +
      "Service products are sold to buyers as fixed-scope and fixed-fee “products”. " +
      "Sellers get to resell their reports, integrations, AI agents and more. Buyers " +
      "get cheaper services, faster deployments, and lower risk. Everyone wins! Click " +
      "the button below to see the service products for your applications/areas.",
    chipsTitle: "What you get",
    chips: [
      "Buy Process-Specific AI Agent Suites",
      "Buy Pre-Built Process KPI Dashboards",
      "Buy an End-to-End Application Demo",
      "Buy a P2P Implementation Cookbook",
      "Buy a Suite of Supplier Portal Training Videos",
    ],
    ctaLabel: HOME_SHOP_CTA,
    ctaHref: null,
    learnMoreHref: "/marketplace",
  },
  {
    key: "work",
    eyebrow: "Reduce Costs....Remove Employment Risks",
    headline: { a: "Go Direct & Save Money.", b: "One Contract, No W2 Risk." },
    body:
      "Create Work Requests using AI with the click of a button and a JD. Instantly " +
      "see the talent you want, ranked by experts and your peers. Interview, hire, " +
      "track and settle with that talent with the click of a button on a " +
      "predetermined contract. You can even integrate your ERP to automate the " +
      "whole process.",
    chipsTitle: "What you get",
    chips: [
      "Post Jobs/Create Work Requests for Free",
      "Immediately Invite Talent to Propose Rate",
      "Hire, Work, and Settle All Talent Under 1 Contract",
      "Track Worker Progress through Entire Work Order",
      "Settle All Talent with Single Payment",
    ],
    ctaLabel: HOME_WORK_CTA,
    ctaHref: "/create-work",
    learnMoreHref: "/work",
  },
  {
    key: "integrate",
    eyebrow: "Integrate to extend apps and deploy AI and BI",
    headline: {
      a: "Punch Out Beyond “Parts”.",
      b: "Deploy Pre-Built AI Agents in Hours.",
    },
    body:
      "Connect to the Panameer AI Platform (AIP) to extend the functionality of " +
      "your ERP and enable continuous improvement via AI agents, analytics, and " +
      "deployable service products.  We create them continuously, once you are " +
      "connected just accept the service product and it is enabled on your data.",
    chipsTitle: "What you get",
    chips: [
      "Read, Accept, & Deploy New Agents in Minutes",
      "Extend Your ERP to Buy Services via Punchout",
      "Instantly Setup Soft Integrations & Leverage AI",
      "Deploy AI Agents Across Applications",
    ],
    ctaLabel: HOME_INTEGRATE_CTA,
    ctaHref: "/erp-integration",
    learnMoreHref: "/integrate",
  },
];
