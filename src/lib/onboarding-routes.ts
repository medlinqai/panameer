// Pages a new member passes through: slim onboarding bar, no promo banner, no marketing chrome.
export const ONBOARDING_PREFIXES = ["/join", "/verify-email", "/invite"] as const;

export const isOnboardingPath = (p: string | null | undefined) =>
  !!p && ONBOARDING_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));
