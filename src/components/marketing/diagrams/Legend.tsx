import { LINE, INK2, LEGEND_KEYS } from "@/components/marketing/diagrams/diagram-tokens";

/**
 * The four-key legend both boards carry. ⚠ IT IS PART OF THE DIAGRAM, not page
 * copy — it names what the three lane tints mean, and the board is unreadable
 * without it. Ported from the mockups' `.legend`/`.key`/`.sw` rules as Tailwind.
 *
 * ⚠ IT SITS OUTSIDE `DiagramShell`'S SCROLL BOX ON PURPOSE: the legend is short
 * enough to wrap at any width, so making it scroll with the 1110px board would
 * hide it at 390 behind a horizontal scroll it does not need.
 */
export function DiagramLegend({ third }: { third: string }) {
  return (
    <div
      className="mt-[18px] flex flex-wrap gap-x-5 gap-y-2 text-[12.5px]"
      style={{ color: INK2 }}
    >
      {LEGEND_KEYS(third).map((k) => (
        <span key={k.label} className="flex items-center gap-[7px]">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-[4px] border"
            style={{ background: k.swatch, borderColor: k.solid ? k.swatch : LINE }}
          />
          {k.label}
        </span>
      ))}
    </div>
  );
}
