/**
 * ── IMPORTING A PLAN FROM EXCEL OR CSV (`P2-ALL-E786`) ──────────────────────
 *
 * ⚠ **SCOTT:** *"Anyone who wants a complex plan builds it in Excel or
 * Microsoft Project and uploads."* ⚠⚠ So this is the escape hatch for the plan
 * the outline editor is deliberately too simple for.
 *
 * ⚠⚠⚠ **PARSING IS PURE AND LIVES HERE; NOTHING IN THIS FILE TOUCHES THE
 * DATABASE.** The gate runs every case below against fixtures with no server
 * and no Postgres, which is the only way the per-row error messages get tested
 * at all — and they are the whole point: **a row that fails says why, and the
 * rest of the file still imports.**
 *
 * ⚠ CSV is parsed here rather than with a library: the format is eight columns
 * of plain text, and the one hard part (quoted fields containing commas,
 * newlines and doubled quotes) is ~30 lines. ⚠⚠ `exceljs` is the one new
 * dependency and it is used for `.xlsx` only.
 */
import { isRowStatus, isRowType, type RowStatus, type RowType } from "./model";

/** The template's columns, in order. ⚠ `Level` is 1 or 2 — the outline depth. */
export const IMPORT_COLUMNS = [
  "Level",
  "Title",
  "Type",
  "Start",
  "End",
  "Status",
  "Owner",
  "Hours",
] as const;

export type ImportedRow = {
  level: 1 | 2;
  title: string;
  type: RowType;
  start: string | null;
  end: string | null;
  status: RowStatus;
  owner: string | null;
  hours: number | null;
};

export type RowProblem = {
  /** 1-based, counting the header as row 1 — what the spreadsheet shows. */
  line: number;
  message: string;
};

export type ParsedPlanFile = {
  rows: ImportedRow[];
  problems: RowProblem[];
};

/* ── CSV ────────────────────────────────────────────────────────────────── */

/**
 * A complete CSV reader: quoted fields, embedded commas and newlines, doubled
 * quotes, CRLF, and a leading BOM (which Excel writes and which otherwise turns
 * the first header into `﻿Level` and silently breaks the column match).
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        /** ⚠ `""` inside a quoted field is one literal quote. */
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "") {
      quoted = true;
      i++;
      continue;
    }
    if (c === ",") {
      endField();
      i++;
      continue;
    }
    if (c === "\r") {
      /** ⚠ CRLF and a lone CR both end the row. */
      if (src[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (c === "\n") {
      endRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  /** ⚠⚠ A file that does not end in a newline still has a last row, and a file
   *  that does must not gain an empty one. */
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/* ── the shared row reader ──────────────────────────────────────────────── */

/**
 * Turn a grid of cells into rows and problems.
 *
 * ⚠⚠⚠ **A BAD ROW IS SKIPPED WITH A REASON — IT NEVER STOPS THE IMPORT.** A
 * spreadsheet of forty rows with one bad date should import thirty-nine and say
 * which one it could not read. An all-or-nothing import of somebody's real plan
 * is the behaviour that makes people stop using the feature.
 */
export function readGrid(grid: string[][]): ParsedPlanFile {
  const rows: ImportedRow[] = [];
  const problems: RowProblem[] = [];

  const nonEmpty = grid.filter((r) => r.some((c) => (c ?? "").trim() !== ""));
  if (nonEmpty.length === 0) return { rows, problems: [{ line: 1, message: "The file is empty." }] };

  const header = nonEmpty[0].map((c) => (c ?? "").trim().toLowerCase());
  const index = new Map<string, number>();
  for (const name of IMPORT_COLUMNS) {
    const at = header.indexOf(name.toLowerCase());
    if (at >= 0) index.set(name, at);
  }
  /** ⚠ Only `Title` is structurally required — everything else can be blank and
   *  the row is still a real row. A missing `Title` COLUMN means the file is
   *  not a plan at all, which is a file-level problem, not a row-level one. */
  if (!index.has("Title")) {
    return {
      rows,
      problems: [
        {
          line: 1,
          message: `No "Title" column. Expected the template's headings: ${IMPORT_COLUMNS.join(", ")}.`,
        },
      ],
    };
  }

  const cell = (r: string[], name: string) => {
    const at = index.get(name);
    return at === undefined ? "" : (r[at] ?? "").trim();
  };

  let lastTopLevel = false;

  for (let n = 1; n < nonEmpty.length; n++) {
    /** ⚠ `+ 1` because a spreadsheet counts its header as row 1. */
    const line = n + 1;
    const r = nonEmpty[n];
    const title = cell(r, "Title");
    if (!title) {
      problems.push({ line, message: "No title — skipped." });
      continue;
    }

    const rawType = cell(r, "Type").toLowerCase() || "task";
    if (!isRowType(rawType)) {
      problems.push({ line, message: `"${cell(r, "Type")}" is not a type. Use phase, task or milestone.` });
      continue;
    }
    const type = rawType as RowType;

    const rawLevel = cell(r, "Level");
    let level: 1 | 2 = rawLevel === "2" ? 2 : 1;
    if (rawLevel && rawLevel !== "1" && rawLevel !== "2") {
      problems.push({ line, message: `Level "${rawLevel}" is not 1 or 2 — treated as 1.` });
      level = 1;
    }
    /** ⚠⚠ A level-2 row with nothing above it has no parent. Rather than drop
     *  it, it is promoted and SAID — silently promoting would change the plan,
     *  and silently dropping would lose the row. */
    if (level === 2 && !lastTopLevel) {
      problems.push({ line, message: "Nothing above this row to sit under — imported at the top level." });
      level = 1;
    }
    if (level === 1) lastTopLevel = type !== "milestone";

    const start = readDate(cell(r, "Start"));
    if (start === false) {
      problems.push({ line, message: `Start "${cell(r, "Start")}" is not a date — left blank.` });
    }
    const end = readDate(cell(r, "End"));
    if (end === false) {
      problems.push({ line, message: `End "${cell(r, "End")}" is not a date — left blank.` });
    }
    const startVal = start === false ? null : start;
    const endVal = end === false ? null : end;
    /** ⚠ Reported, and BOTH are kept — the person can see and fix it in the
     *  editor, which is better than discarding one of the two dates they typed. */
    if (startVal && endVal && endVal < startVal) {
      problems.push({ line, message: "The end date is before the start date." });
    }

    const rawStatus = cell(r, "Status");
    let status: RowStatus = "Planned";
    if (rawStatus) {
      const matched = normaliseStatus(rawStatus);
      if (matched) status = matched;
      else problems.push({ line, message: `Status "${rawStatus}" is not one we know — set to Planned.` });
    }

    const rawHours = cell(r, "Hours");
    let hours: number | null = null;
    if (rawHours) {
      const n2 = Number(rawHours);
      if (Number.isFinite(n2) && n2 >= 0) hours = n2;
      else problems.push({ line, message: `Hours "${rawHours}" is not a number — left blank.` });
    }

    rows.push({
      level,
      title,
      type,
      start: startVal,
      end: endVal,
      status,
      owner: cell(r, "Owner") || null,
      hours,
    });
  }

  return { rows, problems };
}

/** `false` means "there was text and it was not a date"; `null` means blank. */
export function readDate(raw: string): string | null | false {
  if (!raw) return null;
  const s = raw.trim();
  /** ⚠ ISO first — it is what the template writes and what `<input type=date>`
   *  produces. */
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  /** ⚠⚠ `M/D/YYYY` — what a US Excel writes when the cell is text. The two-digit
   *  year is NOT guessed: a plan dated `11/15/26` could mean 1926, and `E549`'s
   *  ruling is that unreadable text is not evidence of a date. */
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return valid(+m[3], +m[1], +m[2]);
  return false;
}

function valid(y: number, mo: number, d: number): string | false {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  /** ⚠ Catches 31 February: the Date rolls over, so the parts must round-trip. */
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  return dt.toISOString().slice(0, 10);
}

function normaliseStatus(raw: string): RowStatus | null {
  const s = raw.trim().toLowerCase();
  /** ⚠ Spelling variants people actually type, mapped onto the four we store.
   *  ⚠⚠ `late` is NOT here — it is computed from the end date and storing it
   *  would let the badge and the dates contradict each other. */
  const map: Record<string, RowStatus> = {
    planned: "Planned",
    "not started": "Planned",
    todo: "Planned",
    "to do": "Planned",
    "in progress": "In progress",
    "in-progress": "In progress",
    wip: "In progress",
    started: "In progress",
    done: "Done",
    complete: "Done",
    completed: "Done",
    finished: "Done",
    blocked: "Blocked",
    "on hold": "Blocked",
  };
  const hit = map[s];
  if (hit) return hit;
  return isRowStatus(raw.trim()) ? (raw.trim() as RowStatus) : null;
}

/* ── Excel ──────────────────────────────────────────────────────────────── */

/**
 * ⚠ `exceljs` is imported lazily so a CSV upload — and every page that merely
 * links to this module — does not pull a megabyte of workbook code.
 */
export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedPlanFile> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return { rows: [], problems: [{ line: 1, message: "That workbook has no sheets." }] };

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const out: string[] = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      out[col - 1] = cellText(c.value);
    });
    grid.push([...out].map((v) => v ?? ""));
  });
  return readGrid(grid);
}

/**
 * ⚠⚠ A DATE CELL COMES BACK AS A `Date`, NOT A STRING, and `String(date)` would
 * produce `Wed Nov 05 2026 …` in the SERVER's zone — which `readDate` cannot
 * read, so every dated row would import blank. ⚠ Excel stores a pure date as
 * UTC midnight, so the UTC parts are the ones to take.
 */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(
      v.getUTCDate(),
    ).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: { text?: string }[] };
    /** ⚠ Hyperlink cells carry `text`; formula cells carry `result`; styled
     *  cells carry `richText` runs that have to be joined or the title arrives
     *  as "[object Object]". */
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text ?? "").join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return String(o.result);
    return "";
  }
  return String(v);
}

export async function parsePlanFile(
  name: string,
  buffer: ArrayBuffer,
): Promise<ParsedPlanFile> {
  if (/\.csv$/i.test(name)) return readGrid(parseCsv(new TextDecoder().decode(buffer)));
  if (/\.xlsx$/i.test(name)) return parseXlsx(buffer);
  /** ⚠⚠ `.xls` and `.mpp` are refused BY NAME with the reason, rather than
   *  being fed to a reader that cannot read them and failing obscurely.
   *  ⚠ Microsoft Project XML is a later decision (Scott, 2026-10-03). */
  return {
    rows: [],
    problems: [
      {
        line: 1,
        message: /\.(xls|mpp|mpx|xml)$/i.test(name)
          ? `We can't read ${name.replace(/^.*\./, ".")} yet — save it as .xlsx or .csv.`
          : "Upload a .xlsx or .csv file.",
      },
    ],
  };
}
