import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Path · Panameer" };

// Registration: one screen right after Verify — the 8-stop road, today on stop 3.
export default async function RegistrationPathPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fjoin%2Fprovider%2Fpath");
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[1120px]" data-registration-path>
        <Logo />
        <h1 className="mt-10 text-[44px] font-extrabold leading-[1.1] sm:text-[52px]">Welcome to Panameer</h1>
        <p className="mt-3 text-[20px] font-bold leading-snug">Your road from sign-up to getting paid</p>
        <p className="mt-2 max-w-[780px] text-[15px] text-ink-2">
          <b className="text-ink">Eight stops, 10–15 minutes to be found.</b> The rest as work comes in: win work three ways at stop 5, then add tax and banking so you&apos;re paid on time.
        </p>
        <div className="mt-4 overflow-x-auto"><div className="min-w-[640px]"><RoadGraphic current={2} /></div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/join/provider" className="inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">
            Complete My Profile
          </Link>
          <Link href="/join/provider/road" data-detailed-road-link className="text-[14px] font-bold text-magenta-dark underline underline-offset-4">
            See the Detailed Road →
          </Link>
        </div>
      </div>
    </main>
  );
}
