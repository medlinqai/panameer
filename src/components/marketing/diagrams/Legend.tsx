import { LINE, INK2, LEGEND_KEYS } from "@/components/marketing/diagrams/diagram-tokens";

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
