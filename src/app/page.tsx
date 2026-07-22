import type { Metadata } from "next";

/**
 * Public marketing root. Only reachable on panameer.com / www.panameer.com —
 * every other host redirects `/` into the app. See `src/proxy.ts`.
 */
export const metadata: Metadata = {
  title: "Panameer — Services procurement, reimagined",
  description:
    "The next generation of services procurement is being built. Coming soon.",
};

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* Soft backdrop wash — decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,0,0,0.05),transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]"
      />

      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
        Panameer
      </h1>

      <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-black/60 dark:text-white/60">
        The next generation of services procurement is being built.
      </p>

      <div className="mt-10 flex items-center gap-4 text-sm">
        <span
          aria-hidden
          className="h-px w-8 bg-black/15 dark:bg-white/20"
        />
        <span className="font-medium uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
          Coming soon
        </span>
        <span
          aria-hidden
          className="h-px w-8 bg-black/15 dark:bg-white/20"
        />
      </div>

      <a
        href="/login"
        className="mt-16 rounded-full px-3 py-1.5 text-sm text-black/45 underline-offset-4 transition-colors hover:text-black/80 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 dark:text-white/45 dark:hover:text-white/80 dark:focus-visible:outline-white/40"
      >
        Sign in
      </a>
    </main>
  );
}
