"use client";

import Link from "next/link";
import { StartBuyingButton } from "@/components/onboarding/StartBuyingButton";

export function NoProfileYet({
  /** "buyer" or "requester" — the path they were trying to start. */
  path,
  /** The `?blocked=` reason, if they arrived from the transact gate. */
  blocked,
  /** The `?from=` door they were originally trying to open. */
  from,
}: {
  path: "buyer" | "requester";
  blocked?: string | null;
  from?: string | null;
}) {
  const qs = new URLSearchParams();
  if (blocked) qs.set("blocked", blocked);
  if (from) qs.set("from", from);
  const companyHref = qs.toString() ? `/company?${qs}` : "/company";

  return (
    <div className="grid min-h-screen place-items-center bg-white px-6 font-body text-ink">
      <div className="w-full max-w-md text-center">
        {/* TEMPLATE LITERALS, NOT JSX TEXT WITH `{path}` INLINE MID-SENTENCE. */}
        <h1 className="text-2xl font-extrabold">
          {`This account has no ${path === "requester" ? "buyer" : path} profile yet`}
        </h1>
        <p className="mt-3 text-ink-2">
          {`You’re signed in, but nothing on the ${path === "requester" ? "buying" : path} side has been set up for ` +
            `this account. Setting up your company is the first step either way — ` +
            `start there and we’ll pick up from what you already have.`}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {path === "requester" && <StartBuyingButton />}
          <Link
            href={companyHref}
            className="bg-ink px-7 py-3 text-[15px] font-semibold text-surface hover:bg-ink-hover"
          >
            Set Up Your Company →
          </Link>
          <Link href="/dashboard" className="text-[14px] font-bold text-ink-2 hover:text-ink">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/** The `?blocked=` / `?from=` pair, read from the URL AFTER MOUNT. */
export function readBlockedParams(): { blocked: string | null; from: string | null } {
  if (typeof window === "undefined") return { blocked: null, from: null };
  const q = new URLSearchParams(window.location.search);
  return { blocked: q.get("blocked"), from: q.get("from") };
}
