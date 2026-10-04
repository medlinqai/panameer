import type { SupplementNotice as Notice } from "@/content/legal/supplement-meta";

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
