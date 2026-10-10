import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";
import { env } from "@/lib/env";
import { DOC_SOURCE_LABEL, docExcerpt } from "@/lib/learn-doc-source";

/** AI-GENERATED path assessments (brief_learn_experience WS5). */

const MODEL = "claude-sonnet-5";

/** Enough context to write questions from, without sending the whole catalog. */
const MAX_SOURCE_CHARS = 60_000;

export const QUESTION_SCHEMA = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  /** Four options; exactly one correct. */
  options: z.array(z.string().min(1)).min(3).max(6),
  correctIndex: z.number().int().min(0),
  /** Shown after the attempt — the teaching moment, not just the mark. */
  explanation: z.string().default(""),
  /** Which course this came from, so a review can point somewhere useful. */
  courseTitle: z.string().default(""),
  /** WHICH LESSON THIS QUESTION TESTS — REQUIRED */
  lessonId: z.string().min(1),
  /** Whether the vendor documentation was needed to write it. */
  sourceKind: z.enum(["LESSON", "LESSON_PLUS_DOCS"]).default("LESSON"),
});

export const ASSESSMENT_SCHEMA = z.object({
  questions: z.array(QUESTION_SCHEMA).min(1),
});

/** THE MODEL'S RAW OUTPUT IS PARSED LENIENTLY, THEN FILTERED, THEN VALIDATED */
const LENIENT_ASSESSMENT_SCHEMA = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string().optional(),
        options: z.array(z.string()).optional(),
        correctIndex: z.number().optional(),
        explanation: z.string().optional(),
        courseTitle: z.string().optional(),
        lessonId: z.string().optional(),
        sourceKind: z.string().optional(),
      })
    )
    .min(1),
});

export type AssessmentQuestion = z.infer<typeof QUESTION_SCHEMA>;

/** What a learner is allowed to see: everything except the answer. */
export type PublicQuestion = Omit<
  AssessmentQuestion,
  "correctIndex" | "explanation" | "lessonId" | "sourceKind"
>;

export function aiAssessmentAvailable(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  // Lazily constructed so a missing key is a disabled feature, never a build
  // failure — the same rule the résumé extractor follows.
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

/** THE THREE CATALOG DEFECTS THAT WOULD POISON A GENERATED TEST */
const EXCLUDE_SECTION_TITLE = [
  /ideas\s+for\s+future/i,
  /^\s*learning\s+path\s+overview\s*$/i,
];

export function sectionIsExcluded(title: string): boolean {
  const t = title.replace(/^\s*\d+\s*[.)]?\s*/, "").trim();
  return EXCLUDE_SECTION_TITLE.some((re) => re.test(t));
}

export type SourceLesson = { id: string; title: string; courseTitle: string };

export type AssessmentSource = {
  title: string;
  text: string;
  lessons: number;
  /** Every lesson the model is allowed to cite, by id. */
  index: SourceLesson[];
  /** What the WS3 filters removed, for the report. */
  excluded: { ideasForFuture: number; pathOverview: number; emptyCourse: number };
  /** Courses whose vendor documentation was included. */
  docSources: string[];
};

/** Flatten a path into the text the model writes questions from. */
export async function buildAssessmentSource(learningPathId: string): Promise<AssessmentSource> {
  const path = await prisma.learningPath.findUnique({
    where: { id: learningPathId },
    select: {
      title: true,
      summary: true,
      courses: {
        orderBy: { sort_order: "asc" },
        select: {
          title: true,
          summary: true,
          doc_source_url: true,
          doc_source_text: true,
          sections: {
            orderBy: { sort_order: "asc" },
            select: {
              title: true,
              description: true,
              lessons: {
                where: { retired_at: null },
                orderBy: { sort_order: "asc" },
                select: { id: true, title: true, description: true, vimeo_ref: true, production_status: true },
              },
            },
          },
        },
      },
    },
  });
  if (!path) throw new Error("No such learning path");

  const lines: string[] = [`LEARNING PATH: ${path.title}`];
  if (path.summary) lines.push(path.summary);
  const index: SourceLesson[] = [];
  const excluded = { ideasForFuture: 0, pathOverview: 0, emptyCourse: 0 };
  const docSources: string[] = [];
  const docBlocks: string[] = [];

  for (const c of path.courses) {
    if (!c.title.trim()) {
      excluded.emptyCourse += c.sections.reduce((n, sec) => n + sec.lessons.length, 0);
      continue;
    }
    lines.push(`\n## COURSE: ${c.title}`);
    if (c.summary) lines.push(c.summary);

    for (const sec of c.sections) {
      if (sectionIsExcluded(sec.title)) {
        if (/ideas\s+for\s+future/i.test(sec.title)) excluded.ideasForFuture += sec.lessons.length;
        else excluded.pathOverview += sec.lessons.length;
        continue;
      }
      lines.push(`\n### SECTION: ${sec.title}`);
      if (sec.description) lines.push(sec.description);
      // L-E042: questions come only from lessons with a video — what a learner can actually watch.
      for (const l of sec.lessons.filter(isPlayable)) {
        index.push({ id: l.id, title: l.title, courseTitle: c.title });
        lines.push(
          l.description
            ? `- [lessonId: ${l.id}] ${l.title} — ${l.description}`
            : `- [lessonId: ${l.id}] ${l.title}`
        );
      }
    }

    // Collected rather than inlined, so the curriculum — which carries the
    const doc = docExcerpt(c.doc_source_text);
    if (doc && c.doc_source_url) {
      docSources.push(c.doc_source_url);
      docBlocks.push(
        `\n<<< ${DOC_SOURCE_LABEL} — for the course "${c.title}"\nSOURCE: ${c.doc_source_url}\n${doc}\n>>> END REFERENCE DOCUMENTATION`
      );
    }
  }

  // THE CURRICULUM IS NEVER THE PART THAT GETS CUT. The old version sliced the
  let text = lines.join("\n");
  for (const block of docBlocks) {
    if (text.length + block.length > MAX_SOURCE_CHARS) break;
    text += block;
  }

  return { title: path.title, text: text.slice(0, MAX_SOURCE_CHARS), lessons: index.length, index, excluded, docSources };
}

/** REJECT ANY QUESTION NAMING A LESSON OUTSIDE THIS PATH (WS2). */
export function keepQuestionsInPath<T extends { lessonId: string }>(
  questions: T[],
  known: Map<string, unknown> | Set<string>
): { kept: T[]; orphaned: T[] } {
  const has = (id: string) => (known instanceof Set ? known.has(id) : known.has(id));
  return {
    kept: questions.filter((q) => has(q.lessonId)),
    orphaned: questions.filter((q) => !has(q.lessonId)),
  };
}

export type GenerateOutcome =
  | {
      ok: true;
      questions: AssessmentQuestion[];
      model: string;
      ms: number;
      /** What was discarded before storage, and why. Reported, never hidden. */
      rejected: { unanswerable: number; orphanedLesson: number };
      /** How evenly the questions cover the path's courses. See the note below. */
      spread: {
        courses: number;
        perCourse: [string, number][];
        concentration: number;
        overCap: boolean;
      };
      docSources: string[];
      /** Token usage, so the batch run can report what it cost. */
      usage: { inputTokens: number; outputTokens: number };
    }
  | { ok: false; message: string };

/** Ask the model for a question set. */
export async function generateAssessment(
  learningPathId: string,
  requested?: number
): Promise<GenerateOutcome> {
  if (!aiAssessmentAvailable()) {
    return { ok: false, message: "AI question generation isn't configured on this environment." };
  }

  const source = await buildAssessmentSource(learningPathId);
  if (source.lessons === 0) {
    return {
      ok: false,
      message: "This path has no lessons yet, so there's nothing to write questions about.",
    };
  }

  const count =
    requested ?? Math.max(5, Math.min(20, Math.round(source.lessons / 4) + 4));
  const started = Date.now();

  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 16000,
      tools: [
        {
          name: "emit_assessment",
          description: "Return the generated multiple-choice assessment.",
          input_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Short stable id, e.g. q1." },
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correctIndex: { type: "number" },
                    explanation: {
                      type: "string",
                      description: "Why the correct answer is correct, in one or two sentences.",
                    },
                    courseTitle: { type: "string" },
                    lessonId: {
                      type: "string",
                      description:
                        "REQUIRED. The exact lessonId, copied from the [lessonId: …] marker of the lesson this question tests. A question you cannot attribute to one of the listed lessons must not be written.",
                    },
                    sourceKind: {
                      type: "string",
                      enum: ["LESSON", "LESSON_PLUS_DOCS"],
                      description:
                        "LESSON if the lesson material alone supports the question; LESSON_PLUS_DOCS if the reference documentation was needed for accuracy.",
                    },
                  },
                  required: [
                    "id",
                    "question",
                    "options",
                    "correctIndex",
                    "explanation",
                    "lessonId",
                    "sourceKind",
                  ],
                },
              },
            },
            required: ["questions"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_assessment" },
      messages: [
        {
          role: "user",
          content:
            `Write a ${count}-question multiple-choice assessment for this Oracle Cloud ` +
            `learning path. It is taken by someone who has just worked through the ` +
            `curriculum below, and passing it earns them a credential shown on a ` +
            `professional profile — so the questions must be answerable from this ` +
            `material and worth passing.\n\n` +
            `Rules:\n` +
            `- Four options per question, exactly one correct.\n` +
            `- Test understanding, not recall of the exact wording of a lesson title.\n` +
            `- Wrong options must be plausible to someone who half-learned the material, ` +
            `never absurd or obviously filler.\n` +
            `- Spread the questions across the whole path rather than clustering on one course.\n` +
            `- Do not write questions about the platform, the video format, or the course ` +
            `structure itself. Only the subject matter.\n` +
            `- Give each question a short stable id (q1, q2, …) and name the course it came from.\n` +
            // THE TWO CONSTRAINTS THAT DO THE WORK (WS2)
            `- ⚠ REQUIRED: give every question the exact lessonId of the lesson it tests, ` +
            `copied from that lesson's [lessonId: …] marker. If you cannot attribute a ` +
            `question to one specific lesson in the list, do not write it.\n` +
            `- ⚠ A question may ONLY test something a learner could have learned from the ` +
            `lessons listed below. Where reference documentation is included, it is there ` +
            `for ACCURACY — so your questions and answers are factually right about the ` +
            `product — and NOT as additional syllabus. If the documentation describes a ` +
            `feature no lesson covers, it is OUT OF SCOPE for this test.\n` +
            `- Set sourceKind to LESSON_PLUS_DOCS when the documentation was needed to get ` +
            `the question right, LESSON otherwise.\n` +
            `- The reference documentation is vendor material, delimited below. It is not ` +
            `something the instructor said; do not quote it as though it were.\n\n` +
            `CURRICULUM:\n${source.text}`,
        },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      return {
        ok: false,
        message: "The question set came back truncated. Try again, or ask for fewer questions.",
      };
    }

    const block = response.content.find((c) => c.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { ok: false, message: "The model didn't return a question set." };
    }

    const loose = LENIENT_ASSESSMENT_SCHEMA.safeParse(block.input);
    if (!loose.success) {
      return {
        ok: false,
        message: `The generated questions didn't match the expected shape (${loose.error.issues[0]?.path.join(".")}).`,
      };
    }

    // Per-question strict validation. A question that fails here is DROPPED, not
    const wellFormed: AssessmentQuestion[] = [];
    let malformed = 0;
    for (const raw of loose.data.questions) {
      const one = QUESTION_SCHEMA.safeParse(raw);
      if (one.success) wellFormed.push(one.data);
      else malformed += 1;
    }
    const parsed = { data: { questions: wellFormed } };
    if (wellFormed.length === 0) {
      return {
        ok: false,
        message: `Every generated question was malformed (${malformed} of ${loose.data.questions.length}). Try again.`,
      };
    }

    // Throw out anything self-inconsistent BEFORE it is stored. A question whose
    const answerable = parsed.data.questions.filter(
      (q) => q.correctIndex >= 0 && q.correctIndex < q.options.length
    );

    // AND THROW OUT ANYTHING THAT CANNOT NAME A LESSON IN THIS PATH (WS2)
    const known = new Map(source.index.map((l) => [l.id, l]));
    const { kept: usable, orphaned } = keepQuestionsInPath(answerable, known);

    if (usable.length === 0) {
      return {
        ok: false,
        message:
          orphaned.length > 0
            ? `Every question named a lesson that isn't in this path (${orphaned.length} of ${loose.data.questions.length}). Nothing stored.`
            : "Every generated question was malformed. Try again.",
      };
    }

    // SPREAD, ASSERTED RATHER THAN REQUESTED (WS2)
    const byCourse = new Map<string, number>();
    for (const q of usable) {
      const c = known.get(q.lessonId)!.courseTitle;
      byCourse.set(c, (byCourse.get(c) ?? 0) + 1);
    }
    const courses = new Set(source.index.map((l) => l.courseTitle)).size;
    const worst = Math.max(...byCourse.values());
    const concentration = worst / usable.length;
    const spread = {
      courses,
      perCourse: [...byCourse.entries()].sort((a, b) => b[1] - a[1]),
      concentration,
      /** Only meaningful on a multi-course path. */
      overCap: courses > 1 && concentration > 0.4,
    };

    return {
      ok: true,
      // Scott 2026-10-10: the model puts the right answer first; shuffle so it lands on a random letter.
      questions: usable.map(shuffleOptions),
      model: MODEL,
      ms: Date.now() - started,
      rejected: {
        unanswerable: malformed + (parsed.data.questions.length - answerable.length),
        orphanedLesson: orphaned.length,
      },
      spread,
      docSources: source.docSources,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (e) {
    console.error("[learn-assessment] generation failed:", e);
    return {
      ok: false,
      message: e instanceof Error ? `Question generation failed: ${e.message}` : "Question generation failed.",
    };
  }
}

/** Random order for a question's options, keeping correctIndex pointing at the right one. */
export function shuffleOptions<Q extends { options: string[]; correctIndex: number }>(q: Q): Q {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
}

/** Strip the answers. The client must never receive correctIndex. */
export function toPublicQuestions(questions: AssessmentQuestion[]): PublicQuestion[] {
  return questions.map(({ id, question, options, courseTitle }) => ({
    id,
    question,
    options,
    courseTitle,
  }));
}

/** THE PUBLISH GATE, IN ONE PLACE (brief_learn_assessments_generate WS4). */
export class AssessmentNotReady extends Error {
  constructor(
    message: string,
    public readonly kind: "MISSING" | "DRAFT"
  ) {
    super(message);
    this.name = "AssessmentNotReady";
  }
}

export async function getPublishedAssessment(learningPathId: string) {
  const row = await prisma.certificationTest.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (!row) {
    throw new AssessmentNotReady(
      "The test for this path hasn't been written yet.",
      "MISSING"
    );
  }
  if (row.status !== "PUBLISHED") {
    throw new AssessmentNotReady(
      "The test for this path is still being reviewed. It'll open once someone has checked the questions.",
      "DRAFT"
    );
  }
  return row;
}

/** Read the cached set, generating it on first use. ADMIN AND BATCH ONLY. */
export async function getOrCreateAssessment(learningPathId: string) {
  const existing = await prisma.certificationTest.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (existing) return existing;

  const outcome = await generateAssessment(learningPathId);
  if (!outcome.ok) throw new Error(outcome.message);

  return prisma.certificationTest.create({
    data: {
      learning_path_id: learningPathId,
      questions: outcome.questions,
      model: outcome.model,
      // DRAFT, like every other generated set. Nothing that writes questions
      source_note: outcome.docSources.length > 0 ? outcome.docSources.join(" ") : null,
    },
  });
}

/** THE REVIEW ACTIONS — PUBLISH, UNPUBLISH, DROP */

/** THE FLOOR A REVIEWED SET MAY NOT FALL THROUGH. */
export const MIN_REVIEWED_QUESTIONS = 5;

export type ReviewOutcome =
  | { ok: true; questions: AssessmentQuestion[]; status: string }
  | { ok: false; message: string; code: "MISSING" | "TOO_FEW" | "NO_PERSON" };

/** Drop questions by id, renumbering nothing — ids are stable and the ORDER is the */
export async function dropQuestions(
  learningPathId: string,
  dropIds: string[]
): Promise<ReviewOutcome> {
  const row = await prisma.certificationTest.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (!row) return { ok: false, message: "No question set for this path.", code: "MISSING" };

  const drop = new Set(dropIds);
  const kept = readQuestions(row).filter((q) => !drop.has(q.id));
  if (kept.length < MIN_REVIEWED_QUESTIONS) {
    return {
      ok: false,
      code: "TOO_FEW",
      message: `That would leave ${kept.length} question${kept.length === 1 ? "" : "s"}. A set needs at least ${MIN_REVIEWED_QUESTIONS} — regenerate it instead.`,
    };
  }

  const saved = await prisma.certificationTest.update({
    where: { learning_path_id: learningPathId },
    data: { questions: kept },
  });
  return { ok: true, questions: readQuestions(saved), status: saved.status };
}

/** Publish a set: `status = PUBLISHED`, and STAMP WHO SAID SO. */
export async function publishAssessment(
  learningPathId: string,
  userId: string
): Promise<ReviewOutcome> {
  const row = await prisma.certificationTest.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (!row) return { ok: false, message: "No question set for this path.", code: "MISSING" };

  const questions = readQuestions(row);
  if (questions.length < MIN_REVIEWED_QUESTIONS) {
    return {
      ok: false,
      code: "TOO_FEW",
      message: `This set has ${questions.length} question${questions.length === 1 ? "" : "s"} and needs at least ${MIN_REVIEWED_QUESTIONS}. Regenerate it before publishing.`,
    };
  }

  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!person) {
    return {
      ok: false,
      code: "NO_PERSON",
      message:
        "This account has no Person record, so the review cannot be attributed. Publishing anonymously would break the Expert badge.",
    };
  }

  const saved = await prisma.certificationTest.update({
    where: { learning_path_id: learningPathId },
    data: { status: "PUBLISHED", reviewed_by: person.id, reviewed_at: new Date() },
  });
  console.info(
    `[learn-assessment] published path=${learningPathId} by=${person.id} questions=${questions.length}`
  );
  return { ok: true, questions: readQuestions(saved), status: saved.status };
}

/** Back to `DRAFT`. */
export async function unpublishAssessment(learningPathId: string): Promise<ReviewOutcome> {
  const row = await prisma.certificationTest.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (!row) return { ok: false, message: "No question set for this path.", code: "MISSING" };

  const saved = await prisma.certificationTest.update({
    where: { learning_path_id: learningPathId },
    data: { status: "DRAFT" },
  });
  return { ok: true, questions: readQuestions(saved), status: saved.status };
}

export function readQuestions(row: { questions: unknown }): AssessmentQuestion[] {
  const parsed = ASSESSMENT_SCHEMA.safeParse({ questions: row.questions });
  return parsed.success ? parsed.data.questions : [];
}

// ---------------------------------------------------------------------------
// Grading, and the credential a pass earns
// ---------------------------------------------------------------------------


export type GradeResult = {
  score: number;
  passed: boolean;
  threshold: number;
  correct: number;
  total: number;
  attemptsUsed: number;
  attemptsAllowed: number;
  /** Per-question review — what they chose, what was right, and why. */
  review: {
    id: string;
    question: string;
    options: string[];
    chosen: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  }[];
  credential: { id: string; url: string } | null;
};

/** Grade an attempt and, on a pass, issue the credential. */
export async function gradeAttempt(
  userId: string,
  learningPathId: string,
  answers: Record<string, number>
): Promise<GradeResult> {
  // PUBLISHED ONLY. Grading a DRAFT would award a certificate from a question
  const assessment = await getPublishedAssessment(learningPathId);
  const questions = readQuestions(assessment);
  if (questions.length === 0) {
    throw new Error("This certification test has no usable questions.");
  }

  const priorAttempts = await prisma.certificationAttempt.count({
    where: { user_id: userId, learning_path_id: learningPathId, is_preview: false },
  });
  const alreadyPassed = await prisma.certificationAttempt.findFirst({
    where: { user_id: userId, learning_path_id: learningPathId, passed: true, is_preview: false },
    select: { id: true },
  });

  // Retakes are limited, but a pass is never blocked by the limit — someone who
  // has already passed re-sitting for interest must not be locked out of their
  // own credential.
  if (!alreadyPassed && priorAttempts >= assessment.max_attempts) {
    throw new Error(
      `You've used all ${assessment.max_attempts} attempts at this test. Work back through the path and contact support if you'd like it reset.`
    );
  }

  const review = questions.map((q) => {
    const chosen = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : null;
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      chosen,
      correctIndex: q.correctIndex,
      correct: chosen === q.correctIndex,
      explanation: q.explanation,
    };
  });

  const correct = review.filter((r) => r.correct).length;
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= assessment.pass_threshold;

  await prisma.certificationAttempt.create({
    data: {
      certification_test_id: assessment.id,
      user_id: userId,
      learning_path_id: learningPathId,
      score,
      passed,
      answers: review.map((r) => ({ questionId: r.id, chosen: r.chosen, correct: r.correct })),
    },
  });

  const credential = passed ? await issueCredential(userId, learningPathId) : null;
  // L-E044: passing a test-out completes the path — it joins My Learning even without lessons watched.
  if (passed) await prisma.learnEnrollment.upsert({ where: { user_id_learning_path_id: { user_id: userId, learning_path_id: learningPathId } }, create: { user_id: userId, learning_path_id: learningPathId }, update: {} }).catch(() => {});

  return {
    score,
    passed,
    threshold: assessment.pass_threshold,
    correct,
    total: questions.length,
    attemptsUsed: priorAttempts + 1,
    attemptsAllowed: assessment.max_attempts,
    review,
    credential,
  };
}

/** A public credential id that is safe to put in a URL. */
function credentialId(): string {
  return createHash("sha256").update(randomUUID()).digest("hex").slice(0, 24);
}

/** Issue (or return) the Learn credential for a passed path. */
export async function issueCredential(
  userId: string,
  learningPathId: string
): Promise<{ id: string; url: string } | null> {
  const [profile, path] = await Promise.all([
    // OPTIONAL NOW. Looked up so a seller's profile still shows the credential
    prisma.providerProfile.findFirst({
      where: { person: { user_id: userId } },
      select: { id: true },
    }),
    prisma.learningPath.findUnique({
      where: { id: learningPathId },
      select: { title: true },
    }),
  ]);
  // ONLY THE PATH IS REQUIRED. `!profile` used to be half of this test — see
  if (!path) return null;

  const existing = await prisma.certification.findFirst({
    where: {
      user_id: userId,
      learning_path_id: learningPathId,
      issued_from: "LEARN",
    },
    select: { credential_id: true, public_credential_url: true },
  });
  if (existing?.credential_id) {
    return {
      id: existing.credential_id,
      url: existing.public_credential_url ?? `/verify/${existing.credential_id}`,
    };
  }

  const id = credentialId();
  await prisma.certification.create({
    data: {
      /* THE OWNER IS THE USER. The profile rides along when there is one. */
      user_id: userId,
      provider_profile_id: profile?.id ?? null,
      name: path.title,
      issuer: "Panameer Learn",
      issued_on: new Date(),
      credential_id: id,
      public_credential_url: `/verify/${id}`,
      issued_from: "LEARN",
      learning_path_id: learningPathId,
    },
  });
  return { id, url: `/verify/${id}` };
}

/** What the learner is allowed to know before sitting the test. */
export async function getTestState(userId: string | null, learningPathId: string) {
  const [assessment, attempts, path] = await Promise.all([
    prisma.certificationTest.findUnique({ where: { learning_path_id: learningPathId } }),
    userId
      ? prisma.certificationAttempt.findMany({
          where: { user_id: userId, learning_path_id: learningPathId, is_preview: false },
          orderBy: { created_at: "desc" },
          select: { id: true, score: true, passed: true, created_at: true },
        })
      : Promise.resolve([]),
    prisma.learningPath.findUnique({
      where: { id: learningPathId },
      select: { title: true, slug: true },
    }),
  ]);

  const passed = attempts.find((a) => a.passed) ?? null;
  return {
    pathTitle: path?.title ?? "",
    pathSlug: path?.slug ?? "",
    exists: Boolean(assessment),
    /** THE ONE THE UI SHOULD BRANCH ON. `exists` says a row is there; `ready` */
    status: assessment?.status ?? null,
    ready: assessment?.status === "PUBLISHED",
    available: aiAssessmentAvailable(),
    questionCount: assessment ? readQuestions(assessment).length : 0,
    threshold: assessment?.pass_threshold ?? 70,
    maxAttempts: assessment?.max_attempts ?? 3,
    attemptsUsed: attempts.length,
    best: attempts.reduce((m, a) => Math.max(m, a.score), 0),
    passed: Boolean(passed),
    attempts,
  };
}
