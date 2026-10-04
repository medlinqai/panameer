export type LegalHeading = { t: "h2" | "h3" | "h4"; text: string };

export type LegalTable = { t: "table"; headers: string[]; rows: string[][] };

export type LegalNode =
  | LegalHeading
  | LegalTable
  /** A region of the source PDF whose table structure did not survive extraction. */
  | { t: "gap"; lines: number }
  | { t: "p"; text: string };
