/**
 * The shape of a rendered legal document (brief_legal_pages_content WS-A).
 *
 * Deliberately tiny. These documents are headings and paragraphs — nothing in
 * either source has a list, a table that survived extraction, or an inline
 * link — and a richer node type would be inventing structure the text does not
 * have.
 */
export type LegalHeading = { t: "h2" | "h3" | "h4"; text: string };

export type LegalNode =
  | LegalHeading
  /** A region of the source PDF whose table structure did not survive extraction. */
  | { t: "gap"; lines: number }
  | { t: "p"; text: string };
