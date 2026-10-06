import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { PATH_STEPS } from "@/lib/user-levels";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Path · Panameer" };

// Registration: one screen right after Verify Email — what's today (2–3) and what waits (4–6).
export default async function RegistrationPathPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fjoin%2Fprovider%2Fpath");
  const steps = PATH_STEPS.provider;
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[720px]" data-registration-path>
        <Logo />
        <p className="mt-8 text-[11px] font-semibold tracking-[0.12em] text-magenta">WELCOME</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight">Here&apos;s the whole path</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-ink-2">
          You don&apos;t need everything today. Company paperwork waits until you&apos;re about to sign your first work order.
        </p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s.key} data-when={i === 0 ? "done" : i <= 2 ? "today" : "later"} className={"border p-3 " + (i === 0 ? "border-line bg-bg-soft" : i <= 2 ? "border-ink" : "border-dashed border-line")}>
              <b className="block text-[13.5px]">{i === 0 ? "✓ " : ""}{s.short}</b>
              <span className={"mt-1 block text-[11px] font-bold tracking-[0.08em] " + (i <= 2 ? "text-ink" : "text-ink-3")}>{i === 0 ? "DONE" : i <= 2 ? "TODAY" : "LATER"}</span>
            </li>
          ))}
        </ol>
        <Link href="/join/provider" className="mt-8 inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">
          Start My Profile
        </Link>
      </div>
    </main>
  );
}
