"use client";

import { ADD_RATE_EVENT } from "@/components/catalog/RatesTable";

// Top of My Catalog › Services, across from the subtitle (Scott 2026-10-12): opens the add form in the rates table.
export function AddRateButton() {
  return (
    <button type="button" data-add-rate-open onClick={() => window.dispatchEvent(new Event(ADD_RATE_EVENT))} className="inline-flex min-h-10 shrink-0 items-center border border-ink px-4 text-[13.5px] font-semibold hover:bg-ink hover:text-surface">
      Add a Service
    </button>
  );
}
