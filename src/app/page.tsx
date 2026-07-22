export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium tracking-wide text-black/60 dark:border-white/15 dark:text-white/60">
        Running on port 3100
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Panameer Digital Services
      </h1>
      <p className="max-w-md text-balance text-black/60 dark:text-white/60">
        Next.js + Prisma + Supabase + Resend. This starter is wired up and ready
        — configure <code className="font-mono">.env.local</code> and start
        building.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm">
        <a
          className="rounded-full bg-foreground px-5 py-2 font-medium text-background transition-opacity hover:opacity-90"
          href="/api/health"
        >
          Health check
        </a>
        <a
          className="rounded-full border border-black/10 px-5 py-2 font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          href="https://supabase.com/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Supabase docs
        </a>
      </div>
    </main>
  );
}
