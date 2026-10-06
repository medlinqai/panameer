import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { LIFECYCLE, LIFECYCLE_WHO } from "@/lib/user-levels";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Path · Panameer" };

// Registration: one screen right after Verify Account — what's today (step 3) and what your company does later.
export default async function RegistrationPathPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fjoin%2Fprovider%2Fpath");
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[860px]" data-registration-path>
        <Logo />
        <p className="mt-8 text-[11px] font-semibold tracking-[0.12em] text-magenta">WELCOME</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight">Here&apos;s the whole path</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] text-ink-2">
          Seven steps from account to getting paid. Today you complete your profile; your company is validated before it signs its first work order.
        </p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-7">
          {LIFECYCLE.map((s, i) => {
            const when = i < 2 ? "done" : i === 2 ? "today" : "later";
            return (
              <li key={s.key} data-when={when} className={"border p-3 " + (when === "today" ? "border-ink" : when === "done" ? "border-line" : "border-dashed border-line")} style={{ background: when === "done" ? LIFECYCLE_WHO[s.who].bg : undefined }}>
                <b className="block text-[13px] leading-snug">{when === "done" ? "✓ " : ""}{s.step}</b>
                <span className="mt-1 block text-[11px] text-ink-3">{s.status}</span>
                <span className={"mt-1 block text-[10.5px] font-bold tracking-[0.08em] " + (when === "later" ? "text-ink-3" : "text-ink")}>{when.toUpperCase()}</span>
              </li>
            );
          })}
        </ol>
        <Link href="/join/provider" className="mt-8 inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">
          Start My Profile
        </Link>
      </div>
    </main>
  );
}
