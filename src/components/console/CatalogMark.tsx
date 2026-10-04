import Image from "next/image";
import {
  Banknote, Boxes, Building2, BugPlay, Code, Cpu, Database, DraftingCompass,
  Factory, Flag, GraduationCap, HeartPulse, Landmark, LayoutGrid, Lightbulb,
  RadioTower, RefreshCw, ShieldCheck, ShoppingBag, Shuffle, Sparkles, Tag,
  Truck, Workflow, Zap,
} from "lucide-react";
import type { Mark, MarkTone } from "@/lib/catalog-marks";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote, Boxes, Building2, BugPlay, Code, Cpu, Database, DraftingCompass,
  Factory, Flag, GraduationCap, HeartPulse, Landmark, LayoutGrid, Lightbulb,
  RadioTower, RefreshCw, ShieldCheck, ShoppingBag, Shuffle, Sparkles, Tag,
  Truck, Workflow, Zap,
};

const TONES: Record<MarkTone, string> = {
  neutral: "border-line bg-ink/[0.04] text-ink-2",
  sky: "border-sky-200 bg-sky-100 text-sky-800",
  violet: "border-violet-200 bg-violet-100 text-violet-800",
  amber: "border-amber-200 bg-amber-100 text-amber-800",
  emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
  teal: "border-teal-200 bg-teal-100 text-teal-800",
  indigo: "border-indigo-200 bg-indigo-100 text-indigo-800",
  cyan: "border-cyan-200 bg-cyan-100 text-cyan-800",
  orange: "border-orange-200 bg-orange-100 text-orange-800",
  lime: "border-lime-200 bg-lime-100 text-lime-800",
  blue: "border-blue-200 bg-blue-100 text-blue-800",
};

const BOX_BASE =
  "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border ";

const box = (tone?: MarkTone) => BOX_BASE + TONES[tone ?? "neutral"];
const BOX = BOX_BASE + TONES.neutral;

export function CatalogMark({ mark }: { mark?: Mark | null }) {
  if (!mark) {
    return (
      <span className={BOX} aria-hidden>
        <Tag className="h-[16px] w-[16px] opacity-50" />
      </span>
    );
  }

  if (mark.kind === "vendor") {
    if (mark.logo) {
      return (
        <span className={BOX}>
          <Image
            src={mark.logo}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
          />
        </span>
      );
    }
    return (
      <span className={BOX} title={mark.monogram}>
        <span className="font-display text-[11px] font-bold tracking-tight">
          {mark.monogram}
        </span>
      </span>
    );
  }

  if (mark.kind === "chip") {
    return (
      <span className={box(mark.tone)}>
        <span className="font-display text-[10.5px] font-bold tracking-tight">
          {mark.chip}
        </span>
      </span>
    );
  }

  const Icon = (mark.icon && ICONS[mark.icon]) || Tag;
  return (
    <span className={box(mark.tone)} aria-hidden>
      <Icon className="h-[16px] w-[16px]" />
    </span>
  );
}
