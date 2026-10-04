import catalogJson from "./aim-catalog.json";

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
  task: string;
  origin: Origin;
};

export type CatalogGate = {
  id: string;
  /** The phase this gate sits after — `Define` … `Prove`. */
  after: string;
  origin: Origin;
  title: string;
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

export const PHASE_NAMES: readonly string[] = PHASES.map((p) => p.name);

export const TASK_STATUSES = ["Not Started", "In Progress", "Blocked", "Done", "N/A"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const GATE_VALUES = ["No", "Yes", "N/A"] as const;
export type GateValue = (typeof GATE_VALUES)[number];

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}

export const JOURNEY_STAGES = ["design", "build", "test", "live"] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export function isJourneyStage(v: unknown): v is JourneyStage {
  return typeof v === "string" && (JOURNEY_STAGES as readonly string[]).includes(v);
}

export const MILESTONE_SEGMENT = "Milestones";

export function journeyTasks(): CatalogTask[] {
  return TASKS.filter((t) => t.id.startsWith("PNM-") && t.segment !== MILESTONE_SEGMENT);
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

export function percentDone(statuses: readonly TaskStatus[]): number | null {
  const counted = statuses.filter((s) => s !== "N/A");
  if (counted.length === 0) return null;
  const done = counted.filter((s) => s === "Done").length;
  return Math.round((done / counted.length) * 100);
}

export function rollupStatus(statuses: readonly TaskStatus[]): TaskStatus | "Not Started" {
  const counted = statuses.filter((s) => s !== "N/A");
  if (counted.length === 0) return "N/A";
  if (counted.every((s) => s === "Done")) return "Done";
  if (counted.some((s) => s === "Blocked")) return "Blocked";
  if (counted.some((s) => s === "In Progress" || s === "Done")) return "In Progress";
  return "Not Started";
}
