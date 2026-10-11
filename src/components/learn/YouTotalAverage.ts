// LT-E004: the personal-hero rule (Scott 2026-10-11) — You · Total · Average, as KPI-row entries for AccountHero.
export type Kpi = { value: React.ReactNode; label: string; delta?: string | null };

export function youTotalAverage(p: { you: number; youLabel: string; month?: number; total: number; totalLabel: string; average: number }): Kpi[] {
  return [
    { value: p.you, label: p.youLabel, delta: p.month ? `+${p.month} this month` : null },
    { value: p.total, label: p.totalLabel },
    { value: p.average, label: "MEMBER AVERAGE" },
  ];
}

/** "Six Certificates and Counting" — words up to twelve, digits after. */
export function countWord(n: number) {
  const w = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return w[n] ?? String(n);
}
