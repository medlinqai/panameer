
export type StandingLine = {
  label: string;
  value: string;
  ok: boolean;
};

export type StandingInput = {
  status: string;
  emailVerified: boolean;
};

export function accountStandingLines(p: StandingInput): StandingLine[] {
  return [
    {
      label: "Account status",
      value: p.status === "ACTIVE" ? "Active" : "Pending email verification",
      ok: p.status === "ACTIVE",
    },
    {
      label: "Email verified",
      value: p.emailVerified ? "Yes" : "Not yet",
      ok: p.emailVerified,
    },
  ];
}

export function accountStandingSummary(lines: StandingLine[]): {
  ok: boolean;
  label: string;
} {
  const bad = lines.find((l) => !l.ok);
  return bad ? { ok: false, label: bad.value } : { ok: true, label: "All good" };
}

export type AccessInput = { availableForMessages: boolean };

export type AccessLine = { label: string; ok: boolean; note: string };

export function accountAccessLines(p: AccessInput): AccessLine[] {
  return [
    {
      label: "Sign in and manage your profile",
      ok: true,
      note: "Available on every account.",
    },
    {
      label: "Receive messages from buyers",
      ok: p.availableForMessages,
      note: p.availableForMessages
        ? "You're marked online for messages."
        : "You've switched off 'Online for messages' in the account menu.",
    },
  ];
}

export function accountCheckCounts(
  lines: ReadonlyArray<ReadonlyArray<{ ok: boolean }>>
): { passing: number; failing: number } {
  const all = lines.flat().map((l) => l.ok);
  const passing = all.filter(Boolean).length;
  return { passing, failing: all.length - passing };
}
