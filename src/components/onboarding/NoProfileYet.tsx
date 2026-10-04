"use client";

import Link from "next/link";

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
        {/*
          ⚠ TEMPLATE LITERALS, NOT JSX TEXT WITH `{path}` INLINE MID-SENTENCE.

          Written the obvious way — `nothing on the {path} path has been set up` —
          JSX swallowed the space after the expression and this shipped as
          "nothing on the buyerpath". It was invisible reading the source and
          obvious in a screenshot. One string per sentence, one space inside it,
          and no JSX whitespace rule to lose an argument with.
        */}
        <h1 className="text-2xl font-extrabold">
          {`This account has no ${path} profile yet`}
        </h1>
        <p className="mt-3 text-ink-2">
          {`You’re signed in, but nothing on the ${path} path has been set up for ` +
            `this account. Setting up your company is the first step either way — ` +
            `start there and we’ll pick up from what you already have.`}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={companyHref}
            className="bg-ink px-7 py-3 text-[15px] font-semibold text-surface hover:bg-ink-hover"
          >
            Set up your company →
          </Link>
          <Link href="/dashboard" className="text-[14px] font-bold text-ink-2 hover:text-ink">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The `?blocked=` / `?from=` pair, read from the URL AFTER MOUNT.
 *
 * ⚠ `window.location.search`, NOT `useSearchParams()`, AND THAT IS ON PURPOSE.
 * `/join/buyer` and `/join/requester` both prerender as `○`. `useSearchParams()`
 * in a client component forces the whole route dynamic unless it is wrapped in a
 * `<Suspense>` boundary, and neither page has one — adding one to move two static
 * pages to `ƒ` for a value that is only read after mount is a worse trade than
 * reading the location directly. Both callers already do their work in an
 * effect, so there is no server render to disagree with.
 */
export function readBlockedParams(): { blocked: string | null; from: string | null } {
  if (typeof window === "undefined") return { blocked: null, from: null };
  const q = new URLSearchParams(window.location.search);
  return { blocked: q.get("blocked"), from: q.get("from") };
}
