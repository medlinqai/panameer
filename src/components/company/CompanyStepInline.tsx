"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CompanyStep, type CompanyOutcome } from "@/components/company/CompanyStep";
import { Notice } from "@/components/onboarding/controls";

/**
 * THE COMPANY FORM, ON `/company` (brief_company_binding_trap WS2).
 *
 * ── ⚠ WHY THIS WRAPPER EXISTS AND WHAT IT IS NOT ─────────────────────────────
 *
 * It is NOT a second company form. `CompanyStep` is imported UNCHANGED and does
 * all the work — search, define, join, the attestation, the company ToS, the
 * domain rule. This file supplies the two things the wizard shells supply and a
 * standalone page does not: a Continue button (the step deliberately does not own
 * one — "two primary actions on one screen" is what its `submitRef` comment
 * exists to prevent) and somewhere to go afterwards.
 *
 * Forking the form was the alternative and it is the specific mistake this
 * codebase has already paid for four times over (E049 → E064 → E080 → E082): two
 * copies of the define/join flow means two places for the attestation, the ToS
 * record and the domain rule to drift, and those three ARE the model.
 *
 * ── ⚠ NOT `bounded` ─────────────────────────────────────────────────────────
 *
 * The wizards pass `bounded` to force the step into one 900px screen. Here the
 * page IS the content and scrolling is fine — which `CompanyStep`'s own prop
 * comment already anticipated.
 *
 * ── ⚠ WHERE IT GOES AFTERWARDS ───────────────────────────────────────────────
 *
 * `?from=` and nothing else. `?blocked=` names the REASON a door closed, not the
 * door — two different pages redirect here with `NO_COMPANY`, so inferring the
 * origin from the reason would send half of them somewhere they never were.
 * Absent or untrusted → `/dashboard`.
 */
export function CompanyStepInline({ from }: { from?: string | null }) {
  const router = useRouter();
  const submit = useRef<null | (() => void)>(null);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CompanyOutcome | null>(null);

  /*
    ⚠ SAME-ORIGIN PATHS ONLY. `from` arrives in a query string, so it is
    attacker-controlled: anything that is not a single-slash absolute path could
    bounce a signed-in person to another origin straight after they accepted a
    company's terms. `//evil.com` is the case a naive `startsWith("/")` misses.
  */
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
          className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
          /*
            PENDING IS NOT FAILURE. The membership exists, so onboarding is
            satisfied and the trap is broken; only transacting still waits. Say
            so rather than bouncing them somewhere that will refuse them again.
          */
          if (outcome.status === "PENDING") {
            setPending(outcome);
            return;
          }
          /*
            `refresh()` before navigating: this page's own no-binding branch is a
            server render, and without it a browser Back lands on a cached "No
            company yet" for a person who now has one.
          */
          router.refresh();
          router.replace(destination);
        }}
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => submit.current?.()}
          className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        {/*
          KEPT AS SECONDARY TEXT for someone who genuinely wants the whole
          wizard. It is no longer the ONLY way out, which is the entire fix.
        */}
        <Link href="/join" className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100">
          Or walk the full sign-up
        </Link>
      </div>
    </div>
  );
}
