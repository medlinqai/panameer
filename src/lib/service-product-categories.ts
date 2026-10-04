
export const ATTESTATION_CATEGORIES = [
  { value: "PRE_PROJECT_CONSULTATION", label: "Pre-Project Consultation" },
  { value: "TRAINING", label: "Training" },
  { value: "TESTING", label: "Testing" },
  { value: "MENTORING", label: "Mentoring" },
] as const;

export type AttestationCategory = (typeof ATTESTATION_CATEGORIES)[number]["value"];

export const ATTESTATION_THRESHOLD_YEARS = 3;

export function meetsThreshold(years: number): boolean {
  return years >= ATTESTATION_THRESHOLD_YEARS;
}

export const MAX_ATTESTED_YEARS = 60;
