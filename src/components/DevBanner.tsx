"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { IS_PRELAUNCH } from "@/lib/site-status";
import { isStatusHost } from "@/lib/host";

export function DevBanner() {
  const [dismissed, setDismissed] = useState(false);

  const pathname = usePathname();

  const [hostKnown, setHostKnown] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => setHostKnown(window.location.host));
  }, []);

  const onTracker: boolean | null =
    pathname === "/status"
      ? true
      : pathname !== "/"
        ? false
        : hostKnown === null
          ? null
          : isStatusHost(hostKnown);

  // Read at module scope from NEXT_PUBLIC_SITE_STATUS, so the whole component
  // tree-shakes out of a launched build rather than rendering hidden.
  if (!IS_PRELAUNCH || dismissed) return null;

  return (
    <div
      data-dev-banner
      className="border-b border-magenta/20 bg-magenta/8 px-4 py-2 text-ink sm:px-6"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-magenta sm:block"
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          {}
          <span className="font-bold">Panameer is the Oracle Cloud marketplace</span>
          {}
          <span className="text-ink-2">
            {" "}
            — hire providers, buy service products and settle the work in one place. Public beta
            opens November&nbsp;15.
          </span>
          {}
          {}
          {onTracker === true ? (
            <TrackerLinks />
          ) : onTracker === false ? (
            <a
              href="https://status.panameer.com"
              target="_blank"
              rel="noreferrer"
              className="ml-2 whitespace-nowrap font-semibold text-magenta underline underline-offset-4"
            >
              Follow the build →
            </a>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12.5px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function TrackerLinks() {
  const { status } = useSession();
  const offerJoin = status === "unauthenticated";

  return (
    <>
      {offerJoin && (
        <>
          <a
            href="/join"
            className="ml-2 whitespace-nowrap font-semibold text-magenta underline underline-offset-4"
          >
            Join free
          </a>
          <span aria-hidden className="mx-1.5 text-ink-3">
            ·
          </span>
        </>
      )}
      <a
        href="/home"
        className={
          "whitespace-nowrap font-semibold text-magenta underline underline-offset-4" +
          (offerJoin ? "" : " ml-2")
        }
      >
        See the full site →
      </a>
    </>
  );
}
