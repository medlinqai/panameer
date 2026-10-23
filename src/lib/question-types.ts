// QB-E001/E005: typed questions (like Oracle Sourcing requirements) — quick to answer, optionally scored. Client-safe (no prisma).
export type QType = "YES_NO" | "PICK_ONE" | "PICK_SEVERAL" | "SCALE" | "NUMBER" | "SHORT_TEXT" | "LONG_TEXT";
export type QOption = { label: string; points?: number | null; knockout?: boolean };
export type Question = { text: string; type: QType; options?: QOption[]; points?: number | null };
export type AnswerValue = string | string[] | number | null;
export type Answer = { value: AnswerValue; prefilled?: boolean; edited?: boolean };

export const QTYPE_LABEL: Record<QType, string> = { YES_NO: "Yes/No", PICK_ONE: "Pick One", PICK_SEVERAL: "Pick Several", SCALE: "1–5 Scale", NUMBER: "Number", SHORT_TEXT: "Short Text", LONG_TEXT: "Long Text" };
export const QTYPES = Object.keys(QTYPE_LABEL) as QType[];
export const MAX_QUESTIONS = 10;
export const textLimit = (t: QType) => (t === "SHORT_TEXT" ? 280 : 1000);
export const hasOptions = (t: QType) => t === "YES_NO" || t === "PICK_ONE" || t === "PICK_SEVERAL";

/** Old sets stored plain strings — they read as Long Text. */
export function normalizeQuestion(raw: unknown): Question {
  if (typeof raw === "string") return { text: raw, type: "LONG_TEXT" };
  const q = (raw ?? {}) as Partial<Question>;
  const type = QTYPES.includes(q.type as QType) ? (q.type as QType) : "LONG_TEXT";
  const options = type === "YES_NO" ? (q.options?.length === 2 ? q.options : [{ label: "Yes" }, { label: "No" }]) : hasOptions(type) ? (q.options ?? []).filter((o) => o?.label?.trim()) : undefined;
  return { text: String(q.text ?? ""), type, ...(options ? { options: options.map((o) => ({ label: String(o.label), points: o.points ?? null, knockout: !!o.knockout })) } : {}), ...(type === "SCALE" ? { points: q.points ?? null } : {}) };
}
export const normalizeQuestions = (raw: unknown): Question[] => (Array.isArray(raw) ? raw.map(normalizeQuestion).filter((q) => q.text.trim()).slice(0, MAX_QUESTIONS) : []);

/** Old answers stored plain strings. */
export function normalizeAnswer(raw: unknown): Answer {
  if (raw == null) return { value: null };
  if (typeof raw === "string" || typeof raw === "number" || Array.isArray(raw)) return { value: raw as AnswerValue };
  const a = raw as Partial<Answer>;
  return { value: (a.value ?? null) as AnswerValue, prefilled: !!a.prefilled, edited: !!a.edited };
}
export const normalizeAnswers = (raw: unknown, n: number): Answer[] => Array.from({ length: n }, (_, i) => normalizeAnswer(Array.isArray(raw) ? raw[i] : null));

export function isAnswered(q: Question, a: Answer): boolean {
  const v = a.value;
  if (q.type === "PICK_SEVERAL") return Array.isArray(v) && v.length > 0;
  if (q.type === "SCALE" || q.type === "NUMBER") return v !== null && v !== "" && Number.isFinite(Number(v));
  return typeof v === "string" ? v.trim().length > 0 : v != null;
}

/** Clean one answer to its type (and length). */
export function cleanAnswer(q: Question, a: Answer, strip: (t: string) => string = (t) => t): Answer {
  const v = a.value;
  const labels = (q.options ?? []).map((o) => o.label);
  let value: AnswerValue = null;
  if (q.type === "PICK_SEVERAL") value = Array.isArray(v) ? v.map(String).filter((x) => labels.includes(x)) : [];
  else if (q.type === "YES_NO" || q.type === "PICK_ONE") value = typeof v === "string" && labels.includes(v) ? v : null;
  else if (q.type === "SCALE") { const n = Math.round(Number(v)); value = n >= 1 && n <= 5 ? n : null; }
  else if (q.type === "NUMBER") { const n = Number(v); value = v !== null && v !== "" && Number.isFinite(n) ? n : null; }
  else value = strip(String(v ?? "")).slice(0, textLimit(q.type));
  return { value, prefilled: !!a.prefilled, edited: !!a.edited };
}

/** How an answer reads on screen. */
export function answerText(a: Answer): string {
  const v = a.value;
  if (v == null || v === "") return "—";
  return Array.isArray(v) ? v.join(", ") || "—" : String(v);
}

/** QB-E005: score = points of the picked options (Scale: value × its points ÷ 5); a knockout option picked knocks out. Null when nothing is scored. */
export function scoreAnswers(qs: Question[], as: Answer[]): { score: number; max: number; knockedOut: string | null } | null {
  let score = 0, max = 0, knockedOut: string | null = null, scored = false;
  qs.forEach((q, i) => {
    const a = as[i] ?? { value: null };
    if (q.type === "SCALE" && q.points) { scored = true; max += q.points; const n = Number(a.value); if (n >= 1 && n <= 5) score += Math.round((q.points * n) / 5); return; }
    if (!q.options?.length) return;
    const picked = q.type === "PICK_SEVERAL" ? (Array.isArray(a.value) ? a.value : []) : typeof a.value === "string" ? [a.value] : [];
    const pts = q.options.map((o) => o.points ?? 0);
    if (q.options.some((o) => o.points || o.knockout)) scored = true;
    max += q.type === "PICK_SEVERAL" ? pts.filter((p) => p > 0).reduce((s, p) => s + p, 0) : Math.max(0, ...pts);
    for (const o of q.options) if (picked.includes(o.label)) { score += o.points ?? 0; if (o.knockout && !knockedOut) knockedOut = `${q.text} — ${o.label}`; }
  });
  return scored ? { score, max, knockedOut } : null;
}
export const scoreTone = (s: { score: number; max: number; knockedOut: string | null }) => (s.knockedOut ? "no" : s.max && s.score / s.max >= 0.8 ? "ok" : s.max && s.score / s.max >= 0.5 ? "pend" : "no");
