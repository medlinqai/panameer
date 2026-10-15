import { RailIcon } from "@/components/casing/RailIcon";
import type { MenuHint } from "@/lib/menu-hint";

// DC-E002/E004: the card's closing clause, with the top-menu item drawn as a faint chip so card ↔ menu reads at a glance.
export function MenuClause({ hint }: { hint: MenuHint | null }) {
  if (!hint) return null;
  return (
    <span data-menu-clause className="mt-1 block text-[13px] text-ink-3">
      Use the button below, or{" "}
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-line bg-bg-soft px-1.5 py-px align-[1px] text-[12.5px] font-semibold text-ink-2">
        {hint.icon && <RailIcon name={hint.icon} className="h-3.5 w-3.5" />}
        {hint.label}
      </span>{" "}
      {hint.top ? "at the top of the page." : "in the menu under your photo."}
    </span>
  );
}
