/** Scaffold body for settings pages that are deferred (Tax / Connect / Accounts). */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-brand border border-line p-6">
      <div className="flex items-center gap-3">
        <h2 className="text-[18px] font-bold">{title}</h2>
        <span className="rounded-full bg-line px-2.5 py-0.5 text-[12px] font-bold text-ink-2">
          Coming Soon
        </span>
      </div>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{body}</p>
    </section>
  );
}
