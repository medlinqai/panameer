import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { LifecycleStrip } from "@/components/lifecycle/LifecycleStrip";
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
        <h1 className="mt-10 text-[44px] font-extrabold leading-[1.1] sm:text-[52px]">Welcome to Panameer</h1>
        <p className="mt-3 text-[22px] font-bold leading-snug">Here&apos;s the whole path</p>
        <p className="mt-2 max-w-[62ch] text-[15px] text-ink-2">
          There are seven steps from creating an account to getting paid. Today you complete your profile (step 3); your company is validated before it signs its first work order.
        </p>
        <div className="mt-8"><LifecycleStrip current={2} intro={false} hereLabel="Today" /></div>
        <Link href="/join/provider" className="mt-8 inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">
          Start My Profile
        </Link>
      </div>
    </main>
  );
}
