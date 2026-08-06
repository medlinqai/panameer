/**
 * The shape of a rendered legal document (brief_legal_pages_content WS-A).
 *
 * Deliberately small. These documents are headings, paragraphs and — since the
 * Privacy Policy's three tables were transcribed by hand from the source —
 * tables. Nothing in any source has a list or an inline link, and a richer node
 * type would be inventing structure the text does not have.
 */
export type LegalHeading = { t: "h2" | "h3" | "h4"; text: string };

/**
 * A table recovered from the source PDF and transcribed by hand.
 *
 * `headers` may be empty for a two-column definition-style table, where the
 * left cell is the label and a header row would only repeat "Recipient / How
 * and why".
 */
export type LegalTable = { t: "table"; headers: string[]; rows: string[][] };

export type LegalNode =
  | LegalHeading
  | LegalTable
  /** A region of the source PDF whose table structure did not survive extraction. */
  | { t: "gap"; lines: number }
  | { t: "p"; text: string };
