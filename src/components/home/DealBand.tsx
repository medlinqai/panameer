import { PathBand, type BandStep } from "@/components/hire/HireUI";
import type { DashRow } from "@/lib/dashboard/types";

// NC-E006: the seller's end-to-end strip — the Jobs for You stages, then the Order — each step's count opens its list; red dot = waiting on you.
const STEPS: [string, string, boolean][] = [["You Matched", "/work/jobs?stage=You%20Matched", true], ["You Applied", "/work/jobs?stage=You%20Applied", false], ["They Requested", "/work/jobs?stage=They%20Requested", true], ["You Answered", "/work/jobs?stage=You%20Answered", false], ["You Interviewed", "/work/jobs?stage=You%20Interviewed", false], ["They Chose You", "/work/jobs?stage=They%20Chose%20You", false], ["To Accept", "/orders/overview", true], ["Active", "/orders/overview", false]];

export function DealBand({ rows }: { rows: DashRow[] }) {
  const counts = STEPS.map(([s]) => rows.filter((r) => r.slice === s && (s === "To Accept" || s === "Active" ? r.type === "Order" : r.type === "Job")).length);
  const lastBusy = Math.max(-1, ...counts.map((c, i) => (c ? i : -1)));
  const band: BandStep[] = STEPS.map(([label, href, needsYou], i) => ({
    key: label, label: label === "To Accept" ? "Order to Accept" : label === "Active" ? "Order Active" : label, href,
    top: <span className={`text-[22px] font-extrabold ${counts[i] ? "text-ink" : "text-state-border"}`}>{counts[i]}</span>,
    bar: i <= lastBusy ? "done" : "todo", current: i === lastBusy, needs: needsYou && counts[i] > 0, muted: !counts[i],
  }));
  return <PathBand steps={band} label="Your Deals" />;
}
