export const REQUESTER_STEPS = [
  "requester_info",
  "work_location",
  "review",
] as const;

export type RequesterStep = (typeof REQUESTER_STEPS)[number];

export const REQUESTER_STEP_LABELS: Record<RequesterStep, string> = {
  requester_info: "Requester Details",
  work_location: "Location Details",
  review: "Review",
};

/** The steps that are actual work — what the pre-flight cards count. */
export const REQUESTER_WORK_STEPS = REQUESTER_STEPS.filter(
  (s) => s !== "review"
) as Exclude<RequesterStep, "review">[];
