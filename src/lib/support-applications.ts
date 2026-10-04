import { PROVIDER_NAV, REQUESTER_NAV, type NavItem } from "@/lib/nav";

function journeyKey(item: NavItem): string {
  return (item.heading ?? item.label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type SupportApplication = { value: string; label: string };

const EXTRA: SupportApplication[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "payments", label: "Payments" },
  { value: "other", label: "Other" },
];

/** The options this reporter should see, in rail order. */
export function supportApplicationsFor(isProvider: boolean): SupportApplication[] {
  const rail = isProvider ? PROVIDER_NAV : REQUESTER_NAV;
  return [
    ...rail.map((i) => ({ value: journeyKey(i), label: i.label })),
    ...EXTRA,
  ];
}

export function supportApplicationLabel(value: string): string {
  const extra = EXTRA.find((e) => e.value === value);
  if (extra) return extra.label;
  for (const item of [...REQUESTER_NAV, ...PROVIDER_NAV]) {
    if (journeyKey(item) === value) return item.heading ?? item.label;
  }
  return value;
}

/** Every value the API will accept — both rails plus the two extras. */
export function allSupportApplicationValues(): string[] {
  const set = new Set<string>(EXTRA.map((e) => e.value));
  for (const item of [...REQUESTER_NAV, ...PROVIDER_NAV]) set.add(journeyKey(item));
  return [...set];
}
