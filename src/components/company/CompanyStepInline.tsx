"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CompanyStep, type CompanyOutcome } from "@/components/company/CompanyStep";
import { Notice } from "@/components/onboarding/controls";

export function CompanyStepInline({ from }: { from?: string | null }) {
  const router = useRouter();
  const submit = useRef<null | (() => void)>(null);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CompanyOutcome | null>(null);

  const destination =
    from && /^\/(?!\/)[\w\-./?=&%#]*$/.test(from) ? from : "/dashboard";

  if (pending) {
    return (
      <div className="space-y-4">
        <Notice>
          Your request to join <strong>{pending.name}</strong> has been sent. An admin there has
          to approve it before you can create work or transact — you&apos;ll keep access to
          everything else in the meantime.
        </Notice>
        <Link
          href={destination}
          className="inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div>
      <CompanyStep
        submitRef={submit}
        onValidityChange={setValid}
        onBusyChange={setBusy}
        onDone={(outcome) => {
          if (outcome.status === "PENDING") {
            setPending(outcome);
            return;
          }
          router.refresh();
          router.replace(destination);
        }}
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => submit.current?.()}
          className="inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        {}
        <Link href="/join" className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100">
          Or walk the full sign-up
        </Link>
      </div>
    </div>
  );
}
