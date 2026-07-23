"use client";

import { useState } from "react";

/** Hero with a working hire/work toggle + search box (visual for now). */
export function Hero() {
  const [mode, setMode] = useState<"hire" | "work">("hire");
  const placeholder =
    mode === "hire"
      ? "Describe what you need to hire for…"
      : "Describe the work you want to find…";

  return (
    <div className="mx-auto max-w-[1180px] px-6">
      <div className="relative mt-[26px] min-h-[520px] overflow-hidden rounded-[22px] bg-[linear-gradient(115deg,#171E3E_0%,#3a1f5c_45%,#8a1f88_100%)]">
        {/* Decorative glow wash (matches mockup ::after). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_80%_-10%,rgba(215,44,214,.35),transparent_60%),radial-gradient(800px_500px_at_10%_110%,rgba(90,31,90,.5),transparent_60%)]"
        />

        {/*
          HERO PHOTO SLOT — replace this gradient with a real hero image later.
          Drop the photo in public/brand (or /public), render it here as an
          absolutely-positioned right-side <Image>, and keep the dark overlay so
          the headline stays legible. Left content column below is max-w-[760px],
          leaving the right side open for the shot.
        */}
        <div
          aria-hidden
          data-hero-photo-slot
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] lg:block"
        />

        <div className="relative z-[2] max-w-[760px] px-[26px] py-11 sm:px-14 sm:py-16">
          <h1 className="mb-[18px] text-[40px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white sm:text-[60px]">
            Work at the speed of opportunity
          </h1>
          <p className="mb-[30px] max-w-[560px] text-[19px] text-[#f3e9f6]">
            Hire experts with years of experience deploying the best practices
            that improve business outcomes.
          </p>

          <div className="mb-[18px] inline-flex rounded-full border border-white/30 bg-white/10 p-[5px]">
            <button
              onClick={() => setMode("hire")}
              className={
                "cursor-pointer rounded-full px-[30px] py-[11px] text-[15px] font-bold transition-colors " +
                (mode === "hire" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to hire
            </button>
            <button
              onClick={() => setMode("work")}
              className={
                "cursor-pointer rounded-full px-[30px] py-[11px] text-[15px] font-bold transition-colors " +
                (mode === "work" ? "bg-white text-magenta" : "text-white")
              }
            >
              I want to work
            </button>
          </div>

          <form
            className="flex max-w-[640px] rounded-[14px] bg-white p-[7px] shadow-brand"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              value=""
              readOnly
              placeholder={placeholder}
              aria-label={placeholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[16px] text-ink outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-magenta px-[22px] py-3 text-[15px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Search →
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            {["Order-to-Cash SME", "Procure-to-Pay SME", "Record-to-Report SME"].map(
              (label) => (
                <span
                  key={label}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/30 bg-white/10 px-4 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  {label} →
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
