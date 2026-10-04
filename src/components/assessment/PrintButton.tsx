"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-magenta px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
    >
      Print / Save as PDF
    </button>
  );
}
