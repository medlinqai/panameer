import { isRowStatus, isRowType, type RowStatus, type RowType } from "./model";

export const IMPORT_COLUMNS = [
  "Level",
  "Title",
  "Type",
  "Start",
  "End",
  "Status",
  "Owner",
  "Hours",
  "Release",
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
  release: string | null;
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
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/* ── the shared row reader ──────────────────────────────────────────────── */

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
    /** `+ 1` because a spreadsheet counts its header as row 1. */
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
    /** A level-2 row with nothing above it has no parent. Rather than drop */
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
    /** Reported, and BOTH are kept — the person can see and fix it in the */
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
      /** Upper-cased and trimmed, so `r1`, ` R1 ` and `R1` are one answer. */
      release: cell(r, "Release").toUpperCase() || null,
    });
  }

  return { rows, problems };
}

/** `false` means "there was text and it was not a date"; `null` means blank. */
export function readDate(raw: string): string | null | false {
  if (!raw) return null;
  const s = raw.trim();
  /** ISO first — it is what the template writes and what `<input type=date>` */
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  /** year is NOT guessed: a plan dated `11/15/26` could mean 1926, and 's */
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return valid(+m[3], +m[1], +m[2]);
  return false;
}

function valid(y: number, mo: number, d: number): string | false {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  /** Catches 31 February: the Date rolls over, so the parts must round-trip. */
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  return dt.toISOString().slice(0, 10);
}

function normaliseStatus(raw: string): RowStatus | null {
  const s = raw.trim().toLowerCase();
  /** Spelling variants people actually type, mapped onto the four we store. */
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

/** links to this module — does not pull a megabyte of workbook code. */
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

/** A DATE CELL COMES BACK AS A `Date`, NOT A STRING, and `String(date)` would */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(
      v.getUTCDate(),
    ).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: unknown; result?: unknown; richText?: { text?: string }[] };
    /** Hyperlink cells carry `text`; formula cells carry `result`; styled */
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
  /** being fed to a reader that cannot read them and failing obscurely. */
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
