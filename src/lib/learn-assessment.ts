import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

/**
 * AI-GENERATED path assessments (brief_learn_experience WS5).
 *
 * Scott's constraint is the design constraint: he will not hand-build question
 * banks, so the test is written by the model from the course content the admin
 * console already captures — path summary, course summaries, section
 * descriptions, lesson titles and descriptions. Transcripts later; the
 * descriptions are what exist today.
 *
 * Reuses the ai-extract.ts pattern deliberately — tool-based structured output,
 * a lazily constructed client, Zod validation of what comes back — because the
 * failure modes are the same ones that were already learned the hard way there:
 * a truncated response arrives as a well-formed empty object, and defaults hide
 * it. See `ai-extract.ts`.
 */

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
});

export const ASSESSMENT_SCHEMA = z.object({
  questions: z.array(QUESTION_SCHEMA).min(1),
});

export type AssessmentQuestion = z.infer<typeof QUESTION_SCHEMA>;

/** What a learner is allowed to see: everything except the answer. */
export type PublicQuestion = Omit<AssessmentQuestion, "correctIndex" | "explanation">;

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

/**
 * Flatten a path into the text the model writes questions from.
 *
 * Lesson TITLES carry most of the signal in this catalog — descriptions are
 * sparse and many are empty — so titles are always included and descriptions
 * are added where they exist, rather than dropping a lesson that has no prose.
 */
export async function buildAssessmentSource(learningPathId: string): Promise<{
  title: string;
  text: string;
  lessons: number;
}> {
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
          sections: {
            orderBy: { sort_order: "asc" },
            select: {
              title: true,
              description: true,
              lessons: {
                orderBy: { sort_order: "asc" },
                select: { title: true, description: true },
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
  let lessons = 0;

  for (const c of path.courses) {
    lines.push(`\n## COURSE: ${c.title}`);
    if (c.summary) lines.push(c.summary);
    for (const s of c.sections) {
      lines.push(`\n### SECTION: ${s.title}`);
      if (s.description) lines.push(s.description);
      for (const l of s.lessons) {
        lessons++;
        lines.push(l.description ? `- ${l.title} — ${l.description}` : `- ${l.title}`);
      }
    }
  }

  return {
    title: path.title,
    text: lines.join("\n").slice(0, MAX_SOURCE_CHARS),
    lessons,
  };
}

export type GenerateOutcome =
  | { ok: true; questions: AssessmentQuestion[]; model: string; ms: number }
  | { ok: false; message: string };

/**
 * Ask the model for a question set.
 *
 * Question COUNT scales with the path: a 1-lesson path with a 20-question exam
 * would be absurd, and a 105-lesson path with 5 questions would be worthless as
 * evidence of anything.
 */
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
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation"],
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
            `- Give each question a short stable id (q1, q2, …) and name the course it came from.\n\n` +
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

    const parsed = ASSESSMENT_SCHEMA.safeParse(block.input);
    if (!parsed.success) {
      return {
        ok: false,
        message: `The generated questions didn't match the expected shape (${parsed.error.issues[0]?.path.join(".")}).`,
      };
    }

    /*
      Throw out anything self-inconsistent BEFORE it is stored. A question whose
      correctIndex points past its own options list is unanswerable — it would
      mark every learner wrong forever, and it is the kind of thing that is
      invisible until someone fails a test they passed.
    */
    const usable = parsed.data.questions.filter(
      (q) => q.correctIndex >= 0 && q.correctIndex < q.options.length
    );
    if (usable.length === 0) {
      return { ok: false, message: "Every generated question was malformed. Try again." };
    }

    return { ok: true, questions: usable, model: MODEL, ms: Date.now() - started };
  } catch (e) {
    console.error("[learn-assessment] generation failed:", e);
    return {
      ok: false,
      message: e instanceof Error ? `Question generation failed: ${e.message}` : "Question generation failed.",
    };
  }
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

/** Read the cached set for a path, generating it on first use. */
export async function getOrCreateAssessment(learningPathId: string) {
  const existing = await prisma.learnAssessment.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (existing) return existing;

  const outcome = await generateAssessment(learningPathId);
  if (!outcome.ok) throw new Error(outcome.message);

  return prisma.learnAssessment.create({
    data: {
      learning_path_id: learningPathId,
      questions: outcome.questions,
      model: outcome.model,
    },
  });
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

/**
 * Grade an attempt and, on a pass, issue the credential.
 *
 * GRADING IS SERVER-SIDE AND THE ANSWERS NEVER LEAVE IT. `toPublicQuestions`
 * strips correctIndex on the way out, the client posts only its choices, and
 * the comparison happens here against the stored set. Any other arrangement
 * means the test is decorative — and this one issues a credential that goes on
 * a professional profile, so it has to actually mean something.
 */
export async function gradeAttempt(
  userId: string,
  learningPathId: string,
  answers: Record<string, number>
): Promise<GradeResult> {
  const assessment = await getOrCreateAssessment(learningPathId);
  const questions = readQuestions(assessment);
  if (questions.length === 0) {
    throw new Error("This assessment has no usable questions.");
  }

  const priorAttempts = await prisma.learnTestAttempt.count({
    where: { user_id: userId, learning_path_id: learningPathId },
  });
  const alreadyPassed = await prisma.learnTestAttempt.findFirst({
    where: { user_id: userId, learning_path_id: learningPathId, passed: true },
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

  await prisma.learnTestAttempt.create({
    data: {
      assessment_id: assessment.id,
      user_id: userId,
      learning_path_id: learningPathId,
      score,
      passed,
      answers: review.map((r) => ({ questionId: r.id, chosen: r.chosen, correct: r.correct })),
    },
  });

  const credential = passed ? await issueCredential(userId, learningPathId) : null;

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

/**
 * A public credential id that is safe to put in a URL.
 *
 * Not the row's uuid: that is an internal key, and a verify URL is pasted into
 * LinkedIn, emailed, and indexed. A separate opaque id means the public
 * identifier can be rotated or revoked without touching the record, and knowing
 * one credential's URL tells you nothing about how to find another.
 */
function credentialId(): string {
  return createHash("sha256").update(randomUUID()).digest("hex").slice(0, 24);
}

/**
 * Issue (or return) the Learn credential for a passed path.
 *
 * Reuses the Certification model rather than forking a parallel one — the
 * schema comment on `issued_from` is explicit that a Learn certificate IS a
 * certification, and a second model would give a provider's profile two
 * Certifications sections that looked identical and behaved differently.
 *
 * Requires a ProviderProfile because that is what Certification hangs off. A
 * learner who is not a provider still passes, still has the attempt recorded,
 * and simply has nowhere to hang the badge yet — reported honestly rather than
 * failing the test they just passed.
 */
export async function issueCredential(
  userId: string,
  learningPathId: string
): Promise<{ id: string; url: string } | null> {
  const [profile, path] = await Promise.all([
    prisma.providerProfile.findFirst({
      where: { person: { user_id: userId } },
      select: { id: true },
    }),
    prisma.learningPath.findUnique({
      where: { id: learningPathId },
      select: { title: true },
    }),
  ]);
  if (!profile || !path) return null;

  const existing = await prisma.certification.findFirst({
    where: {
      provider_profile_id: profile.id,
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
      provider_profile_id: profile.id,
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
    prisma.learnAssessment.findUnique({ where: { learning_path_id: learningPathId } }),
    userId
      ? prisma.learnTestAttempt.findMany({
          where: { user_id: userId, learning_path_id: learningPathId },
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
