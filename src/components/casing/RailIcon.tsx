"use client";

import {
  LayoutDashboard, SlidersHorizontal, GraduationCap, ClipboardList,
  ClipboardCheck, Package, FileSignature, Scale, CreditCard, MessageSquare,
  Users, ArrowLeftRight, FolderTree, Award, Building2, LifeBuoy, ShieldCheck,
  Home, Briefcase, BookOpen, Wallet, BarChart3, MessagesSquare, CalendarClock,
  Tag, Search, Bell, Percent, ListChecks,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, SlidersHorizontal, GraduationCap, ClipboardList,
  ClipboardCheck, Package, FileSignature, Scale, CreditCard, MessageSquare,
  Users, ArrowLeftRight, FolderTree, Award, Building2, LifeBuoy, ShieldCheck,
  Home, Briefcase, BookOpen, Wallet, BarChart3, MessagesSquare, CalendarClock,
  Tag, Search, Bell, Percent, ListChecks,
};

export function RailIcon({ name, className = "h-[18px] w-[18px]" }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon className={`${className} shrink-0`} strokeWidth={1.7} aria-hidden />;
}
