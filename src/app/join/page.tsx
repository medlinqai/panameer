import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Btn } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "Join Panameer — Coming soon",
  description: "Sign up for Panameer. Onboarding is coming soon.",
};

/**
 * Sign-up placeholder. The real onboarding wizard lands in the next brief; for
 * now this is a branded holding page so the marketing CTAs have a destination.
 */
export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center font-body text-ink">
      <Link href="/" aria-label="Panameer home">
        <Image
          src="/brand/panameer-logo.png"
          alt="Panameer"
          width={786}
          height={111}
          priority
          className="h-9 w-auto"
        />
      </Link>
      <h1 className="mt-10 text-[32px] font-extrabold tracking-[-1px] sm:text-[40px]">
        Sign-up is almost here
      </h1>
      <p className="mt-3 max-w-md text-[18px] text-ink-2">
        We&apos;re putting the finishing touches on onboarding. Check back soon to
        create your account and start hiring — or working.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Btn href="/">Back to home</Btn>
        <Link href="/login" className="font-bold hover:text-magenta">
          Log In
        </Link>
      </div>
    </div>
  );
}
