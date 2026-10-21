import { jobPath } from "@/lib/work-request-path";
import { GREEN, PathBand, shortDate, type BandStep } from "@/components/hire/HireUI";

// WP-E001–E003 + HL-E003: the Work Request's own path as one thin band — done = "✓ date", current = magenta text
// (e.g. "1 of 1 in"), optional steps dashed, upcoming grey. The money track stays on the Work Order page.
export async function WorkRequestPath({ jobId }: { jobId: string }) {
  const path = await jobPath(jobId);
  if (!path) return null;
  const { shown, current, awarded } = path;
  const steps: BandStep[] = shown.map((s) => {
    const isCurrent = s.key === current;
    const skipped = s.optional && !s.done && awarded;
    return {
      key: s.key, label: s.key === "wo" ? "Work Order" : s.label, href: s.href, current: isCurrent, muted: !s.done && !isCurrent,
      bar: s.done || isCurrent ? "done" : s.optional ? "dashed" : "todo",
      top: s.done
        ? <span className={`text-[12px] font-bold ${GREEN}`}>✓ {s.date ? shortDate(s.date) : ""}</span>
        : isCurrent
          ? <span className="text-[12px] font-extrabold text-magenta">{s.note ?? "Now"}</span>
          : s.optional
            ? <span className="text-[12px] text-[#8a8494]">{skipped ? "skipped" : "optional"}</span>
            : <span className="text-[12px] text-[#c9c4d6]">&nbsp;</span>,
    };
  });
  return <div data-work-request-path><PathBand steps={steps} label="Progress" /></div>;
}
