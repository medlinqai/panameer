export function ConsoleHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="-mx-5 -mt-6 sm:-mx-8">
      {}
      <section
        className={
          (children ? "pb-[78px] " : "pb-7 ") +
          `
          relative overflow-hidden px-5 pt-7 text-white sm:px-8
          bg-[radial-gradient(900px_340px_at_84%_-10%,color-mix(in_srgb,var(--color-magenta)_42%,transparent),transparent_62%),linear-gradient(118deg,var(--color-rail)_0%,color-mix(in_srgb,var(--color-rail)_82%,var(--color-magenta-dark))_46%,color-mix(in_srgb,var(--color-rail)_58%,var(--color-magenta-dark))_100%)]
        `
        }
      >
        <div className="relative z-[2] min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {eyebrow}
          </p>
          {}
          <h1 className="max-w-[560px] font-display text-[26px] font-bold leading-[1.16] tracking-[-0.4px] sm:text-[31px]">
            {title}
          </h1>
        </div>

        {}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[70px] bg-[linear-gradient(to_bottom,transparent,var(--color-canvas))]"
          aria-hidden
        />
      </section>
      {children}
    </div>
  );
}

export function ConsoleHeroRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[3] -mt-[52px] px-5 sm:px-8">{children}</div>
  );
}
