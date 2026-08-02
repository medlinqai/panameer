"use client";

import {
  LayoutDashboard, SlidersHorizontal, GraduationCap, ClipboardList,
  ClipboardCheck, Package, FileSignature, Scale, CreditCard, MessageSquare,
  Users, ArrowLeftRight, FolderTree, Award, Building2, LifeBuoy, ShieldCheck,
  Home, Briefcase, BookOpen, Wallet, type LucideIcon,
} from "lucide-react";

/**
 * Name → lucide glyph (WS1).
 *
 * An explicit map rather than a dynamic `lucide-react/icons/${name}` import:
 * the dynamic form defeats tree-shaking and pulls the whole ~1,500-icon set
 * into the bundle. Listing the seventeen we use keeps the cost to seventeen.
 *
 * nav.ts stores the NAME, not the component, so that module stays plain data
 * and server code can read the nav without importing React components.
 */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, SlidersHorizontal, GraduationCap, ClipboardList,
  ClipboardCheck, Package, FileSignature, Scale, CreditCard, MessageSquare,
  Users, ArrowLeftRight, FolderTree, Award, Building2, LifeBuoy, ShieldCheck,
  Home, Briefcase, BookOpen, Wallet,
};

export function RailIcon({ name, className = "h-[18px] w-[18px]" }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon className={`${className} shrink-0`} strokeWidth={1.7} aria-hidden />;
}
