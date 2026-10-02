/**
 * ⚠⚠⚠ THE WORK TRACKER CATALOG — ONE DEFINITION, ONE PLACE (`P2-ALL-E752`).
 *
 * The 6 phases, the 4 gates with their criteria, and the 212 AIM tasks are a
 * STATIC FILE in the repo (`aim-catalog.json`), not database rows. The database
 * holds only what an admin CHANGES about them — see the four `WorkTracker*`
 * models and the block above them in `schema.prisma`.
 *
 * ⚠⚠ **EVERY READER GOES THROUGH THIS MODULE.** The admin editor and the public
 * view model both derive from these types, so a task's phase, stage and id have
 * one spelling in the codebase. ⚠ `E585` is the rule: two definitions of one
 * thing will disagree in public, and the second is always found by accident on
 * the surface a stranger sees.
 *
 * ⚠⚠⚠ **NOTHING IN THIS FILE IS PUBLIC BY DEFAULT.** `task` text and gate
 * `criteria` are the "how to recreate Panameer" detail Scott explicitly excluded
 * from status.panameer.com. The public view model is built in its own module and
 * takes only what it names; it never spreads a catalog object.
 */
import catalogJson from "./aim-catalog.json";

/** ⚠ `S` = from the AIM method as published, `P` = Panameer-specific. */
export type Origin = "S" | "P";

export type CatalogPhase = {
  name: string;
  origin: Origin;
  purpose: string;
  outcome: string;
};

export type CatalogTask = {
  id: string;
  phase: string;
  stage: string;
  segment: string;
  /** ⚠⚠ ADMIN-ONLY. This string must never reach the public payload. */
  task: string;
  origin: Origin;
};

export type CatalogGate = {
  id: string;
  /** The phase this gate sits after — `Define` … `Prove`. */
  after: string;
  origin: Origin;
  title: string;
  /** ⚠⚠ ADMIN-ONLY, both halves. `[text, flag]`, positional. */
  criteria: [string, string][];
};

type CatalogFile = {
  version: string | number;
  phases: CatalogPhase[];
  tasks: CatalogTask[];
  gates: CatalogGate[];
};

const CATALOG = catalogJson as unknown as CatalogFile;

export const CATALOG_VERSION = String(CATALOG.version);
export const PHASES: readonly CatalogPhase[] = CATALOG.phases;
export const TASKS: readonly CatalogTask[] = CATALOG.tasks;
export const GATES: readonly CatalogGate[] = CATALOG.gates;

/** ⚠ Phase order is the FILE's order — Define → Design → Build → Prove → Launch
 *  → Operate. It is the method's sequence, not alphabetical, and not a sort. */
export const PHASE_NAMES: readonly string[] = PHASES.map((p) => p.name);

/**
 * ⚠⚠ THE FIVE STATUSES, AND THE ORDER IS THE PICKER'S ORDER.
 * ⚠ `Not Started` is the DEFAULT AND IS NOT STORED — a task with no row is not
 * started. Seeding 212 rows to say nothing would make the table lie about what
 * has actually been decided.
 */
export const TASK_STATUSES = ["Not Started", "In Progress", "Blocked", "Done", "N/A"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** ⚠ `No` is the stored default; ABSENT means UNANSWERED, which is a different
 *  fact and is what the public gate reads as "open". */
export const GATE_VALUES = ["No", "Yes", "N/A"] as const;
export type GateValue = (typeof GATE_VALUES)[number];

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}

export function isGateValue(v: unknown): v is GateValue {
  return typeof v === "string" && (GATE_VALUES as readonly string[]).includes(v);
}

const TASK_BY_ID = new Map(TASKS.map((t) => [t.id, t]));

export function taskById(id: string): CatalogTask | undefined {
  return TASK_BY_ID.get(id);
}

export function gateById(id: string): CatalogGate | undefined {
  return GATES.find((g) => g.id === id);
}

/** ⚠ Stage order within a phase is FIRST-APPEARANCE order in the file, which is
 *  the order the method teaches them. Do not sort it. */
export function stagesForPhase(phase: string): string[] {
  const seen: string[] = [];
  for (const t of TASKS) {
    if (t.phase === phase && !seen.includes(t.stage)) seen.push(t.stage);
  }
  return seen;
}

export function tasksForStage(phase: string, stage: string): CatalogTask[] {
  return TASKS.filter((t) => t.phase === phase && t.stage === stage);
}

/**
 * ⚠⚠⚠ THE ONE PROGRESS RULE, AND IT IS SHARED BY THE ADMIN AND THE PUBLIC PAGE.
 *
 * ⚠ **`N/A` LEAVES THE DENOMINATOR.** A task ruled not-applicable is not an
 * incomplete task, and counting it as one would make a finished phase read 94%
 * forever. ⚠⚠ **A stage whose tasks are ALL `N/A` is not 100% and not 0% — it is
 * UNCOUNTABLE**, and the caller is told so with `null` rather than handed a
 * number it would print as a reassuring figure (`decisions_2026-09-23.md` §1).
 */
export function percentDone(statuses: readonly TaskStatus[]): number | null {
  const counted = statuses.filter((s) => s !== "N/A");
  if (counted.length === 0) return null;
  const done = counted.filter((s) => s === "Done").length;
  return Math.round((done / counted.length) * 100);
}

/** ⚠ The rollup word for a stage or phase. `null` in = nothing countable. */
export function rollupStatus(statuses: readonly TaskStatus[]): TaskStatus | "Not Started" {
  const counted = statuses.filter((s) => s !== "N/A");
  if (counted.length === 0) return "N/A";
  if (counted.every((s) => s === "Done")) return "Done";
  if (counted.some((s) => s === "Blocked")) return "Blocked";
  if (counted.some((s) => s === "In Progress" || s === "Done")) return "In Progress";
  return "Not Started";
}
