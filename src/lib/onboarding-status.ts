
export const ONBOARDING_STATUSES = [
  "Created",
  "In-Process",
  "Complete",
  "Validated",
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
export type OnboardingSide = "BUYER" | "SELLER";

export function buyerStatus(rp: {
  completed_at: Date | null;
  validation_status: string;
} | null): OnboardingStatus {
  if (!rp) return "Created";
  if (rp.validation_status === "VALIDATED") return "Validated";
  if (rp.completed_at) return "Complete";
  return "In-Process";
}

export function sellerStatus(pp: {
  status: string;
  validation_status: string;
} | null): OnboardingStatus {
  if (!pp) return "Created";
  if (pp.validation_status === "VALIDATED") return "Validated";
  if (pp.status === "ACTIVE") return "Complete";
  return "In-Process";
}

export function sidesFor(p: {
  is_service_buyer: boolean;
  is_service_provider: boolean;
  is_service_coordinator: boolean;
  requesterProfile: unknown | null;
  providerProfile: unknown | null;
}): OnboardingSide[] {
  const sides: OnboardingSide[] = [];
  if (p.is_service_buyer || p.requesterProfile) sides.push("BUYER");
  if (p.is_service_provider || p.is_service_coordinator || p.providerProfile)
    sides.push("SELLER");
  return sides;
}
