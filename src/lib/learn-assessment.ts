import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { DOC_SOURCE_LABEL, docExcerpt } from "@/lib/learn-doc-source";

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
  /**
   * ⚠ WHICH LESSON THIS QUESTION TESTS — REQUIRED
   * (brief_learn_assessments_generate WS2).
   *
   * The single most useful constraint available. A question that cannot name the
   * lesson it tests is a question written from the reference documentation alone,
   * or from a title, and both are the exact failure this work exists to prevent.
   * `generateAssessment` REJECTS any question whose `lessonId` is not in the
   * path — the same defensive posture as the existing self-consistency check.
   */
  lessonId: z.string().min(1),
  /**
   * Whether the vendor documentation was needed to write it.
   *
   * Not decoration: it is the field a reviewer sorts by. A LESSON_PLUS_DOCS
   * question is the one most likely to have drifted outside what a learner could
   * have learned here, which is the thing review is for.
   */
  sourceKind: z.enum(["LESSON", "LESSON_PLUS_DOCS"]).default("LESSON"),
});

export const ASSESSMENT_SCHEMA = z.object({
  questions: z.array(QUESTION_SCHEMA).min(1),
});

/**
 * ⚠ THE MODEL'S RAW OUTPUT IS PARSED LENIENTLY, THEN FILTERED, THEN VALIDATED
 * STRICTLY — and that order was learned the hard way.
 *
 * `QUESTION_SCHEMA` is the STORAGE contract and it stays strict. But parsing the
 * model's reply against it makes ONE bad question fail the WHOLE set: measured on
 * the 4-lesson Payroll path, the reply came back with an empty string as a fifth
 * option and the run died with `questions.2.options.4`, discarding nineteen good
 * questions with it.
 *
 * That is the wrong shape of strictness. The file's own established posture is to
 * throw out the bad question and keep the set — the `correctIndex` check right
 * below has always done exactly that. So: read loosely, discard per question,
 * and re-validate each survivor against the strict schema before storage.
 */
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

/**
 * What a learner is allowed to see: everything except the answer.
 *
 * ⚠ `lessonId` AND `sourceKind` ARE ALSO WITHHELD. They exist for the REVIEWER —
 * "which lesson does this test" and "did this need the vendor docs" are the two
 * questions a review turns on — and neither is information a learner mid-test
 * benefits from. Smaller payload, and nothing to reverse-engineer from.
 */
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

/**
 * ── ⚠ THE THREE CATALOG DEFECTS THAT WOULD POISON A GENERATED TEST ───────────
 * (brief_learn_assessments_generate WS3; the defects are `P1-J3-E003`)
 *
 * FILTERED OUT OF THE SOURCE, NOT FIXED HERE. They are content bugs and fixing
 * them inside a generation change would hide them — each is reported with a
 * per-path count instead.
 *
 *   1  "Ideas for Future Videos" — production notes, learner-visible by
 *      accident. One of them is literally
 *      `How to Use Supplier Portal for Sub-Consultants (Portal V Cognibox?)`.
 *
 *   2  "Learning Path Overview" sections. ⚠ WIDER THAN THE BRIEF ASKED, and
 *      deliberately: the brief says exclude the ones naming a DIFFERENT path.
 *      Measured, there are seven, each holding exactly ONE lesson, and four
 *      demonstrably name the next path in the import order (Advanced
 *      Procurement's Catalogs course points at the Supplier Integration LP).
 *      The other three are `Learning Path = Course` and similar — pointers to a
 *      path rather than teachable content. NONE of the seven is material a
 *      question can be right or wrong about, and a name-matching heuristic to
 *      separate four from three would be a fragile guess in place of a simple
 *      true statement. All seven are excluded; the count is reported.
 *
 *   3  Courses with an EMPTY title. Three of them, already omitted from the
 *      spine UI for the same reason.
 */
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

/**
 * Flatten a path into the text the model writes questions from.
 *
 * Lesson TITLES carry most of the signal in this catalog — descriptions are
 * sparse and 290 of 522 are empty — so titles are always included and
 * descriptions are added where they exist, rather than dropping a lesson that
 * has no prose. That is precisely why WS1's reference documentation exists.
 *
 * ⚠ EVERY LESSON IS EMITTED WITH ITS ID, and the ids are returned in `index`.
 * That is what lets `generateAssessment` reject a question naming a lesson
 * outside this path — the constraint is worth nothing if the model cannot see
 * the identifiers it is being asked to cite.
 *
 * ⚠ THE VENDOR DOCS ARE DELIMITED AND LABELLED AS VENDOR DOCS, never presented
 * as though the instructor said it. The prompt then forbids testing anything the
 * lessons do not cover — the docs are context for ACCURACY, not extra syllabus.
 */
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
                orderBy: { sort_order: "asc" },
                select: { id: true, title: true, description: true },
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
      for (const l of sec.lessons) {
        index.push({ id: l.id, title: l.title, courseTitle: c.title });
        lines.push(
          l.description
            ? `- [lessonId: ${l.id}] ${l.title} — ${l.description}`
            : `- [lessonId: ${l.id}] ${l.title}`
        );
      }
    }

    /*
      Collected rather than inlined, so the curriculum — which carries the
      lessonIds the model must cite — is never the part that gets truncated.
    */
    const doc = docExcerpt(c.doc_source_text);
    if (doc && c.doc_source_url) {
      docSources.push(c.doc_source_url);
      docBlocks.push(
        `\n<<< ${DOC_SOURCE_LABEL} — for the course "${c.title}"\nSOURCE: ${c.doc_source_url}\n${doc}\n>>> END REFERENCE DOCUMENTATION`
      );
    }
  }

  /*
    ⚠ THE CURRICULUM IS NEVER THE PART THAT GETS CUT. The old version sliced the
    whole string at MAX_SOURCE_CHARS, which with documentation appended could have
    truncated the lesson list and silently removed ids the model was told to cite.
    Curriculum first, in full; documentation only while there is room.
  */
  let text = lines.join("\n");
  for (const block of docBlocks) {
    if (text.length + block.length > MAX_SOURCE_CHARS) break;
    text += block;
  }

  return { title: path.title, text: text.slice(0, MAX_SOURCE_CHARS), lessons: index.length, index, excluded, docSources };
}

/**
 * ⚠ REJECT ANY QUESTION NAMING A LESSON OUTSIDE THIS PATH (WS2).
 *
 * Extracted rather than inlined so it can be exercised with an INJECTED bad
 * question — the brief asks for exactly that, and a rule enforced only inside a
 * live model call is a rule nobody can test. `check:learn-assessment` calls this
 * with a fabricated orphan.
 *
 * REJECTED, never repaired. A question citing an unknown lessonId was written
 * from the reference documentation or from a title, and there is no honest way to
 * guess which lesson it meant.
 */
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
            /*
              ── ⚠ THE TWO CONSTRAINTS THAT DO THE WORK (WS2) ──────────────────
              The first is checkable after the fact — `lessonId` is rejected if it
              is not in this path — which is why it is stated as a hard rule
              rather than a preference. The second is not checkable, so it is
              stated as plainly as possible: the vendor documentation is there to
              stop the model being WRONG, not to widen the syllabus.
            */
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

    /*
      Per-question strict validation. A question that fails here is DROPPED, not
      repaired: an empty option could be deleted, but that shifts `correctIndex`
      and there is no way to know whether the model meant the option before or
      after the hole.
    */
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

    /*
      Throw out anything self-inconsistent BEFORE it is stored. A question whose
      correctIndex points past its own options list is unanswerable — it would
      mark every learner wrong forever, and it is the kind of thing that is
      invisible until someone fails a test they passed.
    */
    const answerable = parsed.data.questions.filter(
      (q) => q.correctIndex >= 0 && q.correctIndex < q.options.length
    );

    /*
      ── ⚠ AND THROW OUT ANYTHING THAT CANNOT NAME A LESSON IN THIS PATH (WS2) ──

      Same posture as the check above, applied to the constraint that matters
      here. A question citing a lessonId this path does not contain was written
      from the reference documentation or from a title — the precise failure this
      whole change exists to prevent — and it is REJECTED rather than repaired,
      because there is no honest way to guess which lesson it meant.
    */
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

    /*
      ── ⚠ SPREAD, ASSERTED RATHER THAN REQUESTED (WS2) ────────────────────────

      The prompt has always asked for spread "rather than clustering on one
      course". Asking is not the same as checking. A test where two thirds of the
      questions come from one of six courses is not a test of the path, and it is
      the shape a model drifts into when one course has richer descriptions than
      the rest — which, in this catalog, several do.

      REPORTED, NOT REJECTED: dropping questions to satisfy a ratio would thin an
      already-thin set, and the honest response is to hand a reviewer the number.
      Single-course paths are exempt by arithmetic — 100% of one course is the
      only possible answer.
    */
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
      questions: usable,
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

/** Strip the answers. The client must never receive correctIndex. */
export function toPublicQuestions(questions: AssessmentQuestion[]): PublicQuestion[] {
  return questions.map(({ id, question, options, courseTitle }) => ({
    id,
    question,
    options,
    courseTitle,
  }));
}

/**
 * ⚠ THE PUBLISH GATE, IN ONE PLACE (brief_learn_assessments_generate WS4).
 *
 * A generated test nobody has read must not award a certificate, so this is the
 * only function the learner-facing paths go through and it refuses anything that
 * is missing or still DRAFT. `AssessmentNotReady` rather than a bare Error so a
 * route can answer 409 instead of 500 — "not ready yet" is a state, not a fault.
 */
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
  const row = await prisma.learnAssessment.findUnique({
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

/**
 * Read the cached set, generating it on first use. ⚠ ADMIN AND BATCH ONLY.
 *
 * It used to be what the learner's GET went through, which meant clicking "Take
 * the test" could trigger a model call. With the review gate that is worse than
 * wasteful: the call would happen, the set would be stored as DRAFT, and the
 * learner would be told it is not ready. Generation is now a deliberate act —
 * the admin trigger or `prisma/generate-learn-assessments.ts` — and the learner
 * path is a pure read through `getPublishedAssessment`.
 */
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
      /* ⚠ DRAFT, like every other generated set. Nothing that writes questions
         also publishes them. */
      source_note: outcome.docSources.length > 0 ? outcome.docSources.join(" ") : null,
    },
  });
}

/**
 * ── ⚠ THE REVIEW ACTIONS — PUBLISH, UNPUBLISH, DROP (P1-J3-E020) ─────────────
 *
 * `status` has defaulted to `DRAFT` since `brief_learn_assessments_generate`, and
 * `reviewed_by` / `reviewed_at` were added at the same time — and NOTHING WROTE
 * THEM. Every generated set was therefore permanently unsittable: the columns for
 * the human act existed and the act itself was unimplemented. Generating all 23
 * sets would have produced 23 tests nobody could take.
 *
 * ⚠ REVIEW IS NOT AUTHORING. Scott will not hand-build question banks, so there is
 * deliberately no editor here: no `addQuestion`, no way to rewrite a stem or an
 * option. The only destructive act is DROPPING a whole question, and the remedy for
 * a bad set is REGENERATE, not repair.
 */

/**
 * ⚠ THE FLOOR A REVIEWED SET MAY NOT FALL THROUGH.
 *
 * It is the generator's own floor, not a new number:
 * `Math.max(5, Math.min(20, round(lessons / 4) + 4))` in `generateAssessment` can
 * never ask for fewer than five, so a set that drops below five is smaller than
 * anything this system would have written on purpose.
 *
 * ⚠ AND LOWERING IT IS HOW A CERTIFICATE STOPS MEANING ANYTHING. The same argument
 * `MIN_LESSONS` carries in the batch script: a three-question test that certifies
 * somebody is worse than no test.
 */
export const MIN_REVIEWED_QUESTIONS = 5;

export type ReviewOutcome =
  | { ok: true; questions: AssessmentQuestion[]; status: string }
  | { ok: false; message: string; code: "MISSING" | "TOO_FEW" | "NO_PERSON" };

/**
 * Drop questions by id, renumbering nothing — ids are stable and the ORDER is the
 * stored order.
 *
 * ⚠ IT REFUSES TO TAKE THE SET BELOW THE FLOOR, rather than letting the caller
 * discover that at publish time. A reviewer who has just dropped four questions
 * needs to be told immediately, not after clicking Publish.
 *
 * ⚠ DROPPING DOES NOT PUBLISH AND DOES NOT TOUCH `reviewed_by`. Reading a set and
 * standing behind it are two acts; only the second one signs.
 */
export async function dropQuestions(
  learningPathId: string,
  dropIds: string[]
): Promise<ReviewOutcome> {
  const row = await prisma.learnAssessment.findUnique({
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

  const saved = await prisma.learnAssessment.update({
    where: { learning_path_id: learningPathId },
    data: { questions: kept },
  });
  return { ok: true, questions: readQuestions(saved), status: saved.status };
}

/**
 * Publish a set: `status = PUBLISHED`, and STAMP WHO SAID SO.
 *
 * ⚠ `reviewed_by` IS NOT OPTIONAL HERE AND THE REASON IS A DIFFERENT FEATURE.
 * `P1-J2.4-E024` records the EXPERT badge — "created assessment" — as unbuildable
 * because this model recorded only WHICH MODEL wrote a set and never which human
 * stood behind it. A publish that leaves this null makes that badge unearnable all
 * over again, so a viewer with no `Person` CANNOT publish rather than publishing
 * anonymously.
 *
 * ⚠ IT ALSO REFUSES A SET BELOW THE FLOOR. `dropQuestions` checks at drop time and
 * this checks again at publish time, because the two are separate requests and a
 * set can be shrunk by a regenerate in between.
 */
export async function publishAssessment(
  learningPathId: string,
  userId: string
): Promise<ReviewOutcome> {
  const row = await prisma.learnAssessment.findUnique({
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

  const saved = await prisma.learnAssessment.update({
    where: { learning_path_id: learningPathId },
    data: { status: "PUBLISHED", reviewed_by: person.id, reviewed_at: new Date() },
  });
  console.info(
    `[learn-assessment] published path=${learningPathId} by=${person.id} questions=${questions.length}`
  );
  return { ok: true, questions: readQuestions(saved), status: saved.status };
}

/**
 * Back to `DRAFT`.
 *
 * ⚠ IT DELETES NOTHING. Attempts reference this row, and someone who passed last
 * week passed a real test — the same reasoning the regenerate path already carries.
 * Revoking a set from circulation and erasing the history of it being sat are two
 * different acts and only the first one is offered.
 *
 * ⚠ `reviewed_by` AND `reviewed_at` ARE LEFT STANDING. They record that a human DID
 * review this set on that date, which remains true after it is withdrawn; clearing
 * them would rewrite history to say nobody ever looked.
 */
export async function unpublishAssessment(learningPathId: string): Promise<ReviewOutcome> {
  const row = await prisma.learnAssessment.findUnique({
    where: { learning_path_id: learningPathId },
  });
  if (!row) return { ok: false, message: "No question set for this path.", code: "MISSING" };

  const saved = await prisma.learnAssessment.update({
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
  /* ⚠ PUBLISHED ONLY. Grading a DRAFT would award a certificate from a question
     set nobody has read, which is the whole thing the gate exists to stop. */
  const assessment = await getPublishedAssessment(learningPathId);
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
    /**
     * ⚠ THE ONE THE UI SHOULD BRANCH ON. `exists` says a row is there; `ready`
     * says a human has read it. Twenty-two of twenty-three paths have no row at
     * all, and the twenty-third is now DRAFT, so the honest default for every
     * path today is "not ready" rather than "broken".
     */
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
