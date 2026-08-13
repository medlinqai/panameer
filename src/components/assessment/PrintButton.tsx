"use client";

/**
 * "Download PDF" = the browser's own print-to-PDF.
 *
 * NO PDF LIBRARY, ON PURPOSE. A generated PDF is a second renderer of the same
 * six slides, and a second renderer is a second thing that can disagree with
 * the screen — different fonts, a dropped range, a stale number. Printing the
 * actual page means the artifact IS the page, and `deck.css` already sets the
 * landscape page box and one slide per sheet.
 *
 * The label says what it does. "Export" would imply a file arrives; this opens
 * the print dialog, where the user chooses Save as PDF.
 */
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
