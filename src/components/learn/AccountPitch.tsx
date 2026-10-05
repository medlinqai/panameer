import Link from "next/link";

export function AccountPitch({
  callbackUrl,
  cta = "Create a free account",
}: {
  /** Where to return after signing in — always the page they were reading. */
  callbackUrl: string;
  cta?: string;
}) {
  return (
    <div className="rounded-brand border border-magenta/25 bg-magenta/6 p-5">
      <p className="text-[15px] font-bold text-ink">
        Create a free account to earn certifications as you learn.
      </p>
      <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-2">
        {}
        Your progress and certificates save to your profile, each with a public
        verify link you can share.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          {cta}
        </Link>
        <span className="text-[13px] text-ink-2">
          Free — we&apos;ll bring you straight back here.
        </span>
      </div>
    </div>
  );
}
