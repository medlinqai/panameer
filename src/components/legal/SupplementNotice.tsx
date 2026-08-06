import type { SupplementNotice as Notice } from "@/content/legal/supplement-meta";

/**
 * The per-document warning above a supplement's text (WS-C).
 *
 * WHY EACH OF THESE EXISTS. The draft banner every legal page carries says the
 * corpus is unreviewed. That is not enough for these four cases, each of which
 * is a different KIND of not-finished, and a reader who only sees "draft" will
 * assume the words below are at least describing something real:
 *
 *   payments — describes money movement Panameer is building. Regulated, and
 *              wired to nothing. Somebody must not read it as a live promise.
 *   counsel  — a jurisdiction-heavy shell. The structure is there, the
 *              jurisdiction-specific substance is not.
 *   todo     — the text is complete except for a Panameer value nobody has
 *              supplied, and the surrounding prose reads as if it had been.
 *   stub     — the source text is unusable and the page says so instead of
 *              publishing it.
 */
export function SupplementNotice({ notice }: { notice: Notice }) {
  if (notice.kind === "stub") {
    return (
      <div className="mt-6 rounded-brand border-[1.5px] border-dashed border-line p-6">
        <p className="text-[16px] font-bold">This document isn&apos;t written yet.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{notice.body}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          In the meantime:{" "}
          <a
            href="mailto:hello@panameer.com"
            className="font-semibold text-magenta hover:underline"
          >
            hello@panameer.com
          </a>
          .
        </p>
      </div>
    );
  }

  const { heading, body } =
    notice.kind === "payments"
      ? {
          heading: "Payments model in progress — pending counsel",
          body:
            "Panameer's payment and escrow flows are still being built, and money movement is regulated. This document describes the intended model; nothing on Panameer is wired to it, no funds move under it today, and counsel has not reviewed it.",
        }
      : notice.kind === "counsel"
        ? {
            heading: "Pending legal review — counsel to complete",
            body:
              "This is a branded shell of a jurisdiction-specific document. The obligations it covers are real, the specifics are counsel's to write, and nothing here should be relied on as Panameer's position.",
          }
        : { heading: "Incomplete — a Panameer detail is missing", body: notice.what };

  return (
    <div className="mt-6 rounded-brand border-[1.5px] border-amber-300 bg-amber-50 px-5 py-4">
      <p className="text-[15px] font-bold text-amber-900">{heading}</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900/85">{body}</p>
    </div>
  );
}
