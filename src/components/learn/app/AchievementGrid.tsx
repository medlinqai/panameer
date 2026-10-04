"use client";

import { ShieldCheck, Flame, ListChecks, CircleCheckBig, GraduationCap, Trophy, Lock } from "lucide-react";
import type { Achievement } from "@/lib/learn-dashboard";

const ICONS: Record<string, typeof Flame> = {
  first_certificate: ShieldCheck,
  streak_10: Flame,
  hundred_lessons: ListChecks,
  perfect_test: CircleCheckBig,
  course_finisher: GraduationCap,
  path_finisher: Trophy,
};

const MEDAL: Record<string, string> = {
  first_certificate: "bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]",
  streak_10: "bg-[linear-gradient(140deg,#ff7a2f,var(--color-learn-gold))]",
  hundred_lessons: "bg-[linear-gradient(140deg,var(--color-learn-blue),#2c3fa8)]",
  perfect_test: "bg-[linear-gradient(140deg,var(--color-learn-green),#0b7a46)]",
  course_finisher: "bg-[linear-gradient(140deg,#5b3fd8,#8b1fa8)]",
  path_finisher: "bg-[linear-gradient(140deg,#b45309,var(--color-learn-gold))]",
};

export default function AchievementGrid({
  achievements,
}: {
  achievements: Achievement[];
}) {
  const resolved = achievements;

  const unlocked = resolved.filter((a) => a.earned).length;

  return (
    <>
      <div className="mt-8 mb-3.5 flex items-baseline gap-3">
        <h3 className="font-display text-[17px] font-bold">Achievements</h3>
        {}
        <p className="text-[12px] text-ink-2">
          {unlocked} of {resolved.length} unlocked
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {resolved.map((a) => {
          const Icon = ICONS[a.key] ?? Trophy;
          return (
            <div
              key={a.key}
              className={
                "rounded-brand border border-line bg-white px-3 py-4 text-center " +
                (a.earned ? "" : "opacity-60")
              }
            >
              <span
                className={
                  "mx-auto mb-2.5 grid h-[46px] w-[46px] place-items-center rounded-[14px] " +
                  (a.earned ? MEDAL[a.key] ?? MEDAL.path_finisher : "bg-bg-soft")
                }
              >
                {a.earned ? (
                  <Icon className="h-[22px] w-[22px] text-white" aria-hidden />
                ) : (
                  <Lock className="h-[20px] w-[20px] text-ink-2/60" aria-hidden />
                )}
              </span>
              <b className="block text-[11.5px] leading-tight">{a.title}</b>
              <span className="mt-1 block text-[10px] text-ink-2">{a.detail}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
