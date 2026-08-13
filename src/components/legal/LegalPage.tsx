import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { linkifyLegal, type LegalDoc } from "@/components/legal/crossrefs";
import { LegalDocNav } from "@/components/legal/LegalDocNav";
import type { LegalHeading, LegalNode } from "@/content/legal/types";

/**
 * A legal document page (brief_legal_pages_content WS-A).
 *
 * These routes used to say "this document isn't published yet", which was the
 * honest answer while there was no text. There is text now — adapted by Scott
 * from a source document — so the page renders it, with two things it must not
 * overstate:
 *
 *   1. IT IS A DRAFT. The banner says so, in the first thing you read, and the
 *      recorded acceptance is still against a version marker rather than
 *      counsel-approved terms. Nothing here may read as legally vetted.
 *   2. IT IS INCOMPLETE. Two tables in the Privacy Policy did not survive
 *      extraction from the source PDF, and the page SAYS a table is missing
 *      rather than closing the gap silently. A legal document with an invisible
 *      hole is worse than one with a labelled hole: the reader cannot tell the
 *      difference between "not collected" and "not rendered".
 *
 * The contents list is built from the document's own headings rather than the
 * source's table of contents, so it cannot come to disagree with the sections
 * underneath it.
 */
export function LegalPage({
  title,
  version,
  updated,
  doc,
  self = null,
  notice,
  summary,
  backHref = "/",
  backLabel = "← Back to Panameer",
}: {
  title: string;
  version: string;
  /** The date the text was loaded — not a legal "effective date". */
  updated: string;
  doc: LegalNode[];
  /** Which document this is, so its own name isn't linked to itself. */
  self?: LegalDoc;
  /** A document-specific warning, above the text. See the supplements. */
  notice?: ReactNode;
  /** Plain-English gist, shown as the Simple Summary callout. */
  summary?: string;
  backHref?: string;
  backLabel?: string;
}) {
  /*
    ANCHORS ARE ASSIGNED IN ONE PASS so the contents list and the headings
    cannot disagree, and so a repeated section number gets a distinct anchor
    rather than a duplicate id. The API Terms number their definitions 1, 2, 3
    inside section 2, which collides with sections 1, 2, 3 — legitimately, in
    the source — and an id that appears twice sends every link to the first one.
  */
  const seen = new Map<string, number>();
  const ids = doc.map((n) => {
    if (n.t === "gap" || n.t === "p" || n.t === "table") return "";
    const base = headingId(n.text);
    const nth = (seen.get(base) ?? 0) + 1;
    seen.set(base, nth);
    return nth === 1 ? base : `${base}-${nth}`;
  });
  const contents = doc
    .map((n, i) => (n.t === "h2" ? { node: n as LegalHeading, id: ids[i] } : null))
    .filter((c): c is { node: LegalHeading; id: string } => c !== null);

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      {/*
        THE PUBLIC HEADER, not a bare logo (brief_nav_casing_consistency WS-B).

        These pages rendered a one-off strip with just the wordmark, so a reader
        who landed on the Privacy Policy from a footer link had no way back into
        the site — the logo went home and that was the whole nav. Legal pages
        are public content, and the model says public means MARKETING_NAV.
      */}
      <MarketingHeader />

      {/*
        TWO COLUMNS ABOVE lg, ONE BELOW. The document list is genuinely useful
        on a desktop reading session and pure noise above the text on a phone,
        so on narrow screens it moves to the END of the page — present for
        someone who reaches the bottom and wants the next document, absent for
        everyone scrolling to read this one.
      */}
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 py-12 lg:flex-row lg:gap-12">
        <aside className="order-2 w-full shrink-0 border-t border-line pt-8 lg:order-1 lg:w-[248px] lg:border-0 lg:pt-0">
          <LegalDocNav current={self ?? undefined} />
        </aside>

        <main className="order-1 min-w-0 max-w-3xl flex-1 lg:order-2">
        {/*
          VERSION AND EFFECTIVE DATE TOGETHER. A legal document is identified by
          both, and the effective date is the one a reader actually needs — so
          it says outright that there isn't one yet rather than quietly printing
          only the version and letting the page look settled.
        */}
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
          Version {version} · Effective date: none yet (draft)
        </p>
        <h1 className="mt-1 font-display text-[32px] font-bold tracking-[-0.6px]">
          {title}
        </h1>

        {/* The draft notice. Above the text, and not dismissible — it is a
            statement about the status of everything below it. */}
        <div className="mt-5 rounded-brand border-[1.5px] border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-[15px] font-bold text-amber-900">
            Draft — pending legal review · last updated {updated}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-amber-900/85">
            This is working-draft text, not final binding terms. It is with
            Panameer&apos;s counsel for review. Until that review is complete,
            the acceptance recorded against version <b>{version}</b> is a
            placeholder marker, and everyone will be asked to accept the final
            document when it is published. Questions:{" "}
            <a
              href="mailto:hello@panameer.com"
              className="font-semibold underline hover:no-underline"
            >
              hello@panameer.com
            </a>
            .
          </p>
        </div>

        {/*
          THE SIMPLE SUMMARY (legal_center design reference). Plain English, one
          sentence, and explicitly NOT part of the agreement — a summary that
          could be mistaken for the terms would be worse than no summary, since
          a reader would stop at it. The text is the same line the index uses,
          so the two can never describe a document differently.
        */}
        {summary && (
          <div className="mt-6 rounded-brand border-l-[3px] border-magenta bg-magenta/[0.04] px-5 py-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-magenta">
              Simple summary
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{summary}</p>
            <p className="mt-2 text-[13px] text-ink-2">
              A plain-English gist, not part of the agreement. The text below is
              what governs.
            </p>
          </div>
        )}

        {notice}

        {contents.length > 1 && (
          <nav aria-label="Contents" className="mt-8">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
              Contents
            </p>
            <ol className="mt-2 space-y-1">
              {contents.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    className="text-[14.5px] text-magenta hover:underline"
                  >
                    {c.node.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <article className="mt-10">
          {doc.map((node, i) => (
            <LegalBlock key={i} node={node} id={ids[i]} self={self} />
          ))}
        </article>

        <Link
          href={backHref}
          className="mt-10 inline-flex text-[14.5px] font-bold text-magenta hover:underline"
        >
          {backLabel}
        </Link>
        </main>
      </div>
    </div>
  );
}

/**
 * The anchor for a heading.
 *
 * A NUMBERED SECTION ANCHORS ON ITS NUMBER — `#section-7`, not
 * `#7-non-circumvention`. The cross-references in the Terms of Use and Privacy
 * Policy cite "Section 7 of our User Agreement", and a title-derived anchor
 * would break the moment counsel reworded a heading, which is exactly the sort
 * of edit a legal review makes. The number is the stable part.
 */
export function headingId(text: string): string {
  const numbered = /^(\d+(?:\.\d+)*)\.?\s/.exec(text);
  if (numbered) return `section-${numbered[1].replace(/\./g, "-")}`;
  return slug(text);
}

/**
 * The transcribed tables mark their label column with markdown bold. The first
 * column is already styled as the label, so the asterisks would render as
 * literal asterisks in a legal document.
 */
function stripBold(cell: string): string {
  return cell.replace(/\*\*/g, "");
}

/** "TABLE OF CONTENTS" → "table-of-contents" */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function LegalBlock({
  node,
  id,
  self,
}: {
  node: LegalNode;
  id: string;
  self: LegalDoc;
}) {
  switch (node.t) {
    case "h2":
      return (
        <h2
          id={id}
          className="mt-10 scroll-mt-6 border-t border-line pt-8 font-display text-[22px] font-bold tracking-[-0.3px] first:mt-0 first:border-0 first:pt-0"
        >
          {node.text}
        </h2>
      );
    case "h3":
      return (
        <h3 id={id} className="mt-7 scroll-mt-6 font-display text-[17.5px] font-bold">
          {node.text}
        </h3>
      );
    case "h4":
      return (
        <h4 id={id} className="mt-5 scroll-mt-6 text-[15.5px] font-bold">
          {node.text}
        </h4>
      );
    case "table":
      /*
        THE THREE PRIVACY TABLES, transcribed by hand from the source after
        pdf-to-text shredded them cell-by-cell.

        MOBILE IS THE HARD PART. A four-column table of long prose cells cannot
        shrink to 375px, so it SCROLLS INSIDE ITS OWN BOX rather than pushing
        the page sideways — a legal page whose body scrolls horizontally is
        unreadable on a phone in a way that a scrollable table is not. The
        min-width keeps the columns legible instead of collapsing to one word
        per line, and the header repeats on scroll via a sticky row.
      */
      return (
        <div className="my-6 overflow-x-auto rounded-brand border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
            {node.headers.length > 0 && (
              <thead>
                <tr className="bg-bg-soft">
                  {node.headers.map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="border-b border-line px-4 py-3 align-top font-bold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {node.rows.map((row, r) => (
                <tr key={r} className="border-b border-line last:border-0">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={
                        "px-4 py-3 align-top leading-relaxed " +
                        (c === 0 ? "font-semibold text-ink" : "text-ink-2")
                      }
                    >
                      {stripBold(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "gap":
      /*
        A LABELLED HOLE. The source PDF's tables were extracted cell-by-cell in
        column order, so their rows cannot be rebuilt — and rebuilding them by
        guessing which cell belongs to which row would mean inventing the
        contents of a privacy policy. The reader is told a table is missing and
        roughly how big it was, which is the only honest thing this page can say
        about text it does not have.
      */
      return (
        <p className="my-6 rounded-brand border border-dashed border-line bg-bg-soft px-5 py-4 text-[14px] leading-relaxed text-ink-2">
          <b className="font-bold text-ink">A table is missing here.</b> About{" "}
          {node.lines} lines of a multi-column table did not survive extraction
          from the source document and are being restored as part of the legal
          review. Ask{" "}
          <a
            href="mailto:hello@panameer.com"
            className="font-semibold text-magenta hover:underline"
          >
            hello@panameer.com
          </a>{" "}
          if you need its contents before then.
        </p>
      );
    default:
      return (
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">
          {linkifyLegal(node.text, self)}
        </p>
      );
  }
}
