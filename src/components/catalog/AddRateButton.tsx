"use client";

import { ADD_RATE_EVENT } from "@/components/catalog/RatesTable";

// Top of Catalog › Services, across from the subtitle (Scott 2026-10-12): opens the add form in the rates table.
export function AddRateButton() {
  return (
    <button type="button" data-add-rate-open onClick={() => window.dispatchEvent(new Event(ADD_RATE_EVENT))} className="inline-flex min-h-10 shrink-0 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">
      Add a Service
    </button>
  );
}
