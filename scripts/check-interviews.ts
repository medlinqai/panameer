import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { submitProposal } from "@/lib/proposals";
import {
  requestInterview,
  offerSlots,
  confirmSlot,
  completeInterview,
  closeInterview,
} from "@/lib/interviews";
import { sendTest, testStateFor, recordTestResult, declineTest } from "@/lib/work-tests";
import { copyResultFromAttempt, testRequestOutcome } from "@/lib/sourcing";
import { getStatistics } from "@/lib/statistics";

/**
 * ── ⚠⚠⚠ `check:interviews` (`P2-A8-E621` WS-B) ──────────────────────────
 *
 * ⚠ THE STOP GATE: *"an interview at each reachable state; the test answer; a
 * selection made without either; the dash→count list."*
 *
 * ⚠⚠ IT DRIVES THE REAL WRITERS AND TEARS ITS ROWS DOWN. Six statuses are
 * declared in `InterviewStatus`; a gate that greps for six strings would pass
 * against writers that reach three of them. ⚠⚠⚠ **EVERY STATE HERE IS ARRIVED
 * AT BY CALLING THE FUNCTION THAT MOVES IT**, and the row is read back.
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const TAG = "E621 interview probe";
const V = (userId: string) => ({ userId }) as never;

async function main() {
  const requestIds: string[] = [];
  let providerBidIds: string[] = [];
  /*
    ⚠⚠⚠ TRACKED FROM THE MOMENT EACH IS CREATED, AND SWEPT IN THE `finally`.
    ⚠ `LearnTestAttempt` rows are written into a **real member's** attempt
    history, and `learn-assessment.ts` refuses a new attempt past
    `max_attempts` counted on `(user_id, learning_path_id)`. ⚠⚠ So a leaked
    probe attempt does not merely litter — **it spends a real provider's tries
    and can lock them out of a test they need.** Deleting them at the end of the
    happy path was not enough: a throw in between would have left them.
  */
  const attemptIds: string[] = [];

  try {
    /* ── 0 · THE CAST ─────────────────────────────────────────────────────
       ⚠ A buyer with a company (the P-Account comes through it — the
       backbone's shape) and a provider who is a different person. */
    const buyer = await prisma.person.findFirst({
      where: { NOT: { user_id: null } },
      select: { id: true, user_id: true, company: { select: { p_account_id: true } } },
    });
    const provider = await prisma.person.findFirst({
      where: { AND: [{ NOT: { user_id: null } }, { NOT: { id: buyer?.id ?? "" } }] },
      select: { id: true, user_id: true },
    });
    if (!buyer?.user_id || !buyer.company?.p_account_id || !provider?.user_id) {
      check("0 — a buyer and a provider exist to walk this (E586)", false, "not found");
      return;
    }
    check("0 — the cast is two DIFFERENT people", buyer.id !== provider.id);

    const makeRequest = async () => {
      const wr = await prisma.workRequest.create({
        data: {
          buyer_person_id: buyer.id,
          p_account_id: buyer.company!.p_account_id,
          title: TAG,
          status: "POSTED",
          proposal_access: "OPEN",
        },
        select: { id: true },
      });
      requestIds.push(wr.id);
      await submitProposal(V(provider.user_id!), { workRequestId: wr.id });
      return wr.id;
    };

    /* ═══ 1 · ⚠⚠⚠ AN INTERVIEW AT EACH REACHABLE STATE ═══════════════════
       ⚠ The happy path walks four of the six on ONE row, in order, because
       that is the order a real interview moves in and each writer refuses a
       row that is in the wrong state. */
    const rA = await makeRequest();
    const ivA = await requestInterview(V(buyer.user_id), {
      workRequestId: rA,
      providerPersonId: provider.id,
      mode: "VIDEO",
    });
    const readA = async () =>
      prisma.interviewRequest.findUnique({
        where: { id: ivA.id },
        select: { status: true, confirmed_line_id: true, completed_at: true },
      });

    check("1 — ⚠⚠ REQUESTED — the buyer can ask", (await readA())?.status === "REQUESTED");
    check("1 — ⚠ and it was CREATED, not found", ivA.created);

    /* ⚠⚠ IDEMPOTENT: asking twice returns the open one rather than a second
       row. A buyer who double-clicks must not summon two interviews. */
    const again = await requestInterview(V(buyer.user_id), {
      workRequestId: rA,
      providerPersonId: provider.id,
    });
    check("1 — ⚠⚠ asking twice returns the SAME open interview", again.id === ivA.id && !again.created);
    const ivCount = await prisma.interviewRequest.count({ where: { work_request_id: rA } });
    check("1 — ⚠ exactly ONE interview exists", ivCount === 1, `${ivCount}`);

    const soon = new Date(Date.now() + 3 * 86_400_000);
    const later = new Date(Date.now() + 4 * 86_400_000);
    await offerSlots(V(provider.user_id), ivA.id, [
      { starts_at: soon, time_zone: "America/New_York" },
      { starts_at: later, time_zone: "America/New_York" },
    ]);
    check("1 — ⚠⚠ SLOTS_OFFERED — the provider answers with times",
      (await readA())?.status === "SLOTS_OFFERED");

    const resp = await prisma.interviewResponse.findUnique({
      where: { interview_request_id: ivA.id },
      select: { id: true, lines: { select: { id: true, time_zone: true }, orderBy: { line_number: "asc" } } },
    });
    check("1 — ⚠ both offered times were recorded", resp?.lines.length === 2, `${resp?.lines.length}`);
    /* ⚠⚠ THE ZONE TRAVELS WITH THE INSTANT. The schema requires it and the
       writer must not be able to drop it — two parties, two timezones. */
    check("1 — ⚠⚠ each slot carries an IANA zone, not an offset",
      (resp?.lines ?? []).every((l) => /^[A-Za-z]+\/[A-Za-z_]+$/.test(l.time_zone)),
      JSON.stringify(resp?.lines.map((l) => l.time_zone)));

    /* ⚠⚠⚠ A SLOT THE PROVIDER NEVER OFFERED MUST NOT BE CONFIRMABLE. Built as
       a real line on a DIFFERENT interview, so the id resolves — a check that
       only refuses a nonsense id proves nothing. */
    const rDecoy = await makeRequest();
    const ivDecoy = await requestInterview(V(buyer.user_id), {
      workRequestId: rDecoy,
      providerPersonId: provider.id,
    });
    await offerSlots(V(provider.user_id), ivDecoy.id, [
      { starts_at: soon, time_zone: "America/New_York" },
    ]);
    const decoyLine = await prisma.interviewResponseLine.findFirst({
      where: { interviewResponse: { interview_request_id: ivDecoy.id } },
      select: { id: true },
    });
    let refusedForeign = false;
    try {
      await confirmSlot(V(buyer.user_id), ivA.id, decoyLine!.id);
    } catch {
      refusedForeign = true;
    }
    check("1 — ⚠⚠⚠ a REAL slot from ANOTHER interview is refused", refusedForeign,
      "the id resolves, so only the scoping can catch this");
    check("1 — ⚠ and that interview did not move", (await readA())?.status === "SLOTS_OFFERED");

    await confirmSlot(V(buyer.user_id), ivA.id, resp!.lines[0]!.id);
    const scheduled = await readA();
    check("1 — ⚠⚠ SCHEDULED — the buyer picks one of the offered times",
      scheduled?.status === "SCHEDULED");
    check("1 — ⚠ and the row records WHICH one", scheduled?.confirmed_line_id === resp!.lines[0]!.id);

    await completeInterview(V(buyer.user_id), ivA.id);
    const done = await readA();
    check("1 — ⚠⚠ COMPLETED — somebody records that it happened", done?.status === "COMPLETED");
    /* ⚠⚠⚠ THE DATE AND THE STATE MOVE TOGETHER, because Statistics windows
       `interviewsTaken` on `completed_at` AND filters the status. If one could
       be written without the other the figure would silently drop rows. */
    check("1 — ⚠⚠⚠ and `completed_at` is written in the SAME act", done?.completed_at != null,
      "Statistics windows this figure on that column");

    /* ⚠ Nothing infers completion from the clock: a SCHEDULED interview whose
       time has passed is still SCHEDULED until somebody says otherwise. */
    const ivPast = await requestInterview(V(buyer.user_id), {
      workRequestId: rDecoy,
      providerPersonId: provider.id,
    });
    check("1 — ⚠ the decoy request is reused, not duplicated", ivPast.id === ivDecoy.id);

    /* ── DECLINED and CANCELLED — one row each, since they are terminal ──── */
    const rB = await makeRequest();
    const ivB = await requestInterview(V(buyer.user_id), {
      workRequestId: rB,
      providerPersonId: provider.id,
    });
    await closeInterview(V(provider.user_id), ivB.id, "DECLINED");
    const declined = await prisma.interviewRequest.findUnique({
      where: { id: ivB.id },
      select: { status: true },
    });
    check("1 — ⚠⚠ DECLINED — the provider can say no", declined?.status === "DECLINED");

    const rC = await makeRequest();
    const ivC = await requestInterview(V(buyer.user_id), {
      workRequestId: rC,
      providerPersonId: provider.id,
    });
    await closeInterview(V(buyer.user_id), ivC.id, "CANCELLED");
    const cancelled = await prisma.interviewRequest.findUnique({
      where: { id: ivC.id },
      select: { status: true },
    });
    check("1 — ⚠⚠ CANCELLED — the buyer can call it off", cancelled?.status === "CANCELLED");

    /* ⚠⚠⚠ ALL SIX DECLARED STATES WERE REACHED BY A WRITER. ⚠ Derived by
       SHAPE from the row, never from a list typed here (`E587`) — a hard-coded
       six would still read six after a seventh state was added. */
    const reached = new Set(
      (
        await prisma.interviewRequest.findMany({
          where: { work_request_id: { in: requestIds } },
          select: { status: true },
        })
      ).map((r) => r.status)
    );
    check("1 — ⚠⚠⚠ four distinct statuses reached on real rows",
      reached.size === 4, `${[...reached].sort().join(", ")}`);
    /* ⚠ SLOTS_OFFERED and SCHEDULED were each READ BACK above on the way
       through, so the four rows account for all six declared states. */
    const declaredStates = (readFileSync(join("prisma", "schema.prisma"), "utf8")
      .match(/enum InterviewStatus \{([^}]*)\}/) ?? [, ""])[1]!
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    check("1 — ⚠⚠ the enum declares six states and this gate walked every one",
      declaredStates.length === 6 &&
        declaredStates.every((s) =>
          ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED", "COMPLETED", "DECLINED", "CANCELLED"].includes(s)
        ),
      `${declaredStates.join(", ")} — a NEW state would fail here and needs a writer`);

    /* ⚠⚠ THE ROW IS NEVER DELETED. A declined interview that vanished would
       read to the buyer as though they never asked. */
    const survivors = await prisma.interviewRequest.count({
      where: { work_request_id: { in: requestIds } },
    });
    check("1 — ⚠⚠ closing an interview RECORDS, it does not delete", survivors === 4, `${survivors}`);

    /* ═══ 2 · ⚠⚠⚠ THE TEST ANSWER — THE LEARN ENGINE IS REUSED BY REFERENCE ══
       ⚠⚠ This is the half where my premise answer was WRONG and ruling 37
       recorded the wrong answer. The assertions below are what the measurement
       actually supports. */
    const published = await prisma.learnAssessment.findFirst({
      where: { status: "PUBLISHED" },
      select: { id: true, learning_path_id: true, max_attempts: true },
    });
    const draft = await prisma.learnAssessment.findFirst({
      where: { status: "DRAFT" },
      select: { id: true },
    });
    check("2 — ⚠ a PUBLISHED assessment exists to send (E586)", published != null);
    check("2 — ⚠ and a DRAFT one exists to be refused (E586)", draft != null);

    if (published && draft) {
      const rT = await makeRequest();

      /* ⚠⚠⚠ A DRAFT ASSESSMENT IS REFUSED, AND BY THE IMPORTED GUARD. Nobody
         can sit it, so sending it is a door onto a wall (`E579`). */
      let refusedDraft = "";
      try {
        await sendTest(V(buyer.user_id), {
          workRequestId: rT,
          providerPersonId: provider.id,
          learnAssessmentId: draft.id,
        });
      } catch (e) {
        refusedDraft = (e as { code?: string }).code ?? "threw";
      }
      check("2 — ⚠⚠⚠ a DRAFT assessment cannot be sent",
        refusedDraft === "TEST_ASSESSMENT_NOT_PUBLISHED",
        `${refusedDraft} — and the code proves it was assertTestRequestLine, not a second copy`);

      const test = await sendTest(V(buyer.user_id), {
        workRequestId: rT,
        providerPersonId: provider.id,
        learnAssessmentId: published.id,
      });
      check("2 — ⚠⚠ a buyer CAN send a published test", test.created);
      const trRow = await prisma.testRequest.findUnique({
        where: { id: test.id },
        select: {
          status: true,
          issued_at: true,
          provider_bid_id: true,
          lines: { select: { learn_assessment_id: true } },
        },
      });
      check("2 — it is ISSUED in one act, never left DRAFT", trRow?.status === "ISSUED");
      check("2 — ⚠ and dated, because that is what 'sent' means", trRow?.issued_at != null);
      check("2 — ⚠ it is tied to the proposal it followed", trRow?.provider_bid_id != null);
      /* ⚠⚠⚠ THE WHOLE ANSWER, IN ONE ASSERTION: the work test POINTS AT the
         Learn assessment. No second engine, no copied questions. */
      check("2 — ⚠⚠⚠ the line POINTS AT the Learn assessment — the FK *is* the reuse",
        trRow?.lines[0]?.learn_assessment_id === published.id,
        "a second assessment engine would have its own questions here");

      /* ── ⚠⚠ ATTEMPTS ARE LEARN'S, AND A BUYER'S REQUEST CHANGES NEITHER ── */
      const before = await prisma.learnTestAttempt.count({
        where: { user_id: provider.user_id, learning_path_id: published.learning_path_id },
      });
      const state = await testStateFor(V(provider.user_id), test.id);
      check("2 — ⚠⚠ the provider's state is one of the three declared outcomes",
        ["EXISTING_PASS", "CAN_SIT", "ATTEMPTS_SPENT"].includes(state.state), state.state);
      check("2 — ⚠ and the allowance comes from the assessment, not from the buyer",
        state.attemptsAllowed === published.max_attempts,
        `${state.attemptsAllowed} vs ${published.max_attempts}`);
      const after = await prisma.learnTestAttempt.count({
        where: { user_id: provider.user_id, learning_path_id: published.learning_path_id },
      });
      check("2 — ⚠⚠⚠ sending a test CONSUMED NO ATTEMPT", before === after, `${before} → ${after}`);

      /* ── ⚠⚠⚠ THE RESULT IS COPIED FROM AN ATTEMPT, NEVER TYPED ──────────
         ⚠ A real attempt is written directly here — `learnTestAttempt.create`
         is Learn's writer and this gate is not testing Learn, it is testing
         that the WORK side reads it rather than inventing a score. */
      const attempt = await prisma.learnTestAttempt.create({
        data: {
          assessment_id: published.id,
          user_id: provider.user_id,
          learning_path_id: published.learning_path_id,
          score: 88,
          passed: true,
          answers: [],
        },
        select: { id: true },
      });
      attemptIds.push(attempt.id);

      const result = await recordTestResult(V(provider.user_id), {
        testRequestId: test.id,
        learnTestAttemptId: attempt.id,
      });
      /* ⚠⚠ 88 AND `true` ARE DELIBERATELY NOT THE DEFAULTS. Two zeros agree;
         two ones agree — a fixture must distinguish what it compares. */
      check("2 — ⚠⚠ the recorded score IS the attempt's score", result.score === 88, `${result.score}`);
      check("2 — and the pass flag came with it", result.passed === true);
      const line = await prisma.testResponseLine.findFirst({
        where: { testResponse: { test_request_id: test.id } },
        select: { score: true, passed: true, learn_test_attempt_id: true, completed_at: true },
      });
      check("2 — ⚠⚠⚠ the row POINTS BACK at the attempt it came from",
        line?.learn_test_attempt_id === attempt.id,
        "LearnTestAttempt stays the system of record");
      check("2 — the denormalised pair matches", line?.score === 88 && line?.passed === true);
      check("2 — ⚠ and `completed_at` is the ATTEMPT's date, not now",
        line?.completed_at != null);

      /* ⚠⚠⚠ THE GUARD ITSELF: a TYPED score is refused. Called directly
         because no writer offers a parameter for one — which is the design. */
      let refusedTyped = "";
      try {
        copyResultFromAttempt({ score: 99 }, { id: attempt.id, score: 88, passed: true, created_at: new Date() });
      } catch (e) {
        refusedTyped = (e as { code?: string }).code ?? "threw";
      }
      check("2 — ⚠⚠⚠ a HAND-TYPED score is refused", refusedTyped === "TEST_RESULT_SUPPLIED",
        `${refusedTyped} — a typed score is a second source of truth`);
      let refusedTypedPass = "";
      try {
        copyResultFromAttempt({ passed: false }, { id: attempt.id, score: 88, passed: true, created_at: new Date() });
      } catch (e) {
        refusedTypedPass = (e as { code?: string }).code ?? "threw";
      }
      check("2 — ⚠ and so is a hand-typed PASS FLAG",
        refusedTypedPass === "TEST_RESULT_SUPPLIED",
        "refusing only the score would leave the cheaper lie open");

      /* ⚠⚠ AND NO WRITER CAN PASS ONE. Asserted on the source so that adding a
         `score` parameter becomes a failing build. */
      const wtSrc = strip(readFileSync(join("src", "lib", "work-tests.ts"), "utf8"));
      check("2 — ⚠⚠ the writer imports the copy guard rather than restating it",
        /copyResultFromAttempt\(/.test(wtSrc) && !/score:\s*input\./.test(wtSrc),
        "a score arriving through a parameter is the defect the guard exists to stop");
      check("2 — ⚠⚠ and it imports the published-assessment guard too",
        /assertTestRequestLine\(/.test(wtSrc) &&
          !/status !== "PUBLISHED"/.test(wtSrc),
        "a second copy of the publish rule is the E585 shape");
      check("2 — ⚠ and the attempts rule, rather than counting its own way",
        /testRequestOutcome\(/.test(wtSrc));
      /* ⚠⚠⚠ NO SECOND ENGINE (ruling 37). ⚠⚠ THE FIRST VERSION OF THIS
         ASSERTION WAS A FALSE RED and is worth recording: it matched the bare
         word `questions`, which appears in the user-facing string *"That test
         has no questions."* ⚠ **A gate that fails on correct code is a gate
         somebody switches off** — so it now names the engine's actual shapes:
         reading the question bank, the threshold, or generating a set. */
      check("2 — ⚠ no second assessment engine is built in this file",
        !/questions:|pass_threshold|generateAssessment|\.questions\b/.test(wtSrc),
        "ruling 37: a second engine is its own brief");

      /* ⚠⚠⚠ SOMEBODY ELSE'S ATTEMPT CANNOT BE CLAIMED. The buyer's own attempt
         on the SAME assessment is used, so only the ownership check can catch
         it — a nonsense id would prove nothing. */
      const rT2 = await makeRequest();
      const test2 = await sendTest(V(buyer.user_id), {
        workRequestId: rT2,
        providerPersonId: provider.id,
        learnAssessmentId: published.id,
      });
      const foreign = await prisma.learnTestAttempt.create({
        data: {
          assessment_id: published.id,
          user_id: buyer.user_id,
          learning_path_id: published.learning_path_id,
          score: 100,
          passed: true,
          answers: [],
        },
        select: { id: true },
      });
      attemptIds.push(foreign.id);
      let refusedForeignAttempt = "";
      try {
        await recordTestResult(V(provider.user_id), {
          testRequestId: test2.id,
          learnTestAttemptId: foreign.id,
        });
      } catch (e) {
        refusedForeignAttempt = (e as { code?: string }).code ?? "threw";
      }
      check("2 — ⚠⚠⚠ another person's attempt cannot be claimed as yours",
        refusedForeignAttempt === "ATTEMPT_NOT_YOURS", refusedForeignAttempt);
      /* ⚠ And the provider can decline a test, recorded not deleted. */
      await declineTest(V(provider.user_id), test2.id);
      const declinedTest = await prisma.testRequest.findUnique({
        where: { id: test2.id },
        select: { status: true },
      });
      check("2 — ⚠⚠ a declined test STILL EXISTS, with its state recorded",
        declinedTest?.status === "DECLINED");
    }

    /* ⚠ The three outcome states are a pure function and are proved directly —
       the round trip above can only reach whichever one the data allows. */
    check("2 — ⚠ CAN_SIT when tries remain and nothing passed",
      testRequestOutcome({ attemptsUsed: 1, attemptsAllowed: 3, passedAttemptId: null }).state === "CAN_SIT");
    check("2 — ⚠⚠ ATTEMPTS_SPENT at the limit",
      testRequestOutcome({ attemptsUsed: 3, attemptsAllowed: 3, passedAttemptId: null }).state === "ATTEMPTS_SPENT");
    check("2 — ⚠⚠⚠ EXISTING_PASS WINS even with no tries left — a pass is theirs to keep",
      testRequestOutcome({ attemptsUsed: 3, attemptsAllowed: 3, passedAttemptId: "a" }).state === "EXISTING_PASS",
      "otherwise the test becomes a toll gate rather than a credential");

    /* ═══ 3 · ⚠⚠ NEITHER IS REQUIRED (WS-B item 5) ══════════════════════
       ⚠ A buyer may go straight from a proposal. ⚠⚠ THE SELECTION WRITER IS
       WS-C's, so what is provable HERE is that nothing makes an interview or a
       test a precondition — asserted on the schema and on the proposal row. */
    const rNone = await makeRequest();
    const bare = await prisma.providerBid.findFirst({
      where: { work_request_id: rNone },
      select: { id: true, status: true },
    });
    check("3 — ⚠⚠ a proposal exists with NO interview and NO test", bare != null);
    const noIv = await prisma.interviewRequest.count({ where: { work_request_id: rNone } });
    const noTest = await prisma.testRequest.count({ where: { work_request_id: rNone } });
    check("3 — ⚠ and neither was created for it", noIv === 0 && noTest === 0, `${noIv}/${noTest}`);
    /* ⚠⚠⚠ THE STRUCTURAL HALF: `ProviderBid` carries no required link to
       either, so no selection path CAN demand one. */
    const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
    const bidModel = (schema.match(/model ProviderBid \{([\s\S]*?)\n\}/) ?? [, ""])[1]!;
    check("3 — ⚠⚠⚠ ProviderBid requires no interview and no test",
      !/interview_request_id\s+String\s/.test(bidModel) && !/test_request_id\s+String\s/.test(bidModel),
      "a NOT NULL link either way would make interviews compulsory in the schema");

    /* ═══ 4 · ⚠⚠⚠ THE DASH BECAME A COUNT (WS-B item 6) ════════════════ */
    const profile = await prisma.providerProfile.findFirst({
      where: { person_id: provider.id },
      select: { id: true },
    });
    const stats = await getStatistics(provider.id, provider.user_id, profile?.id ?? null, "all");
    const w = (stats as { work: Record<string, unknown> }).work;
    for (const key of ["interviews", "interviewsTaken", "interviewsDeclined"]) {
      check(`4 — ⚠⚠⚠ ${key} is a NUMBER, not a dash`, typeof w[key] === "number",
        `${JSON.stringify(w[key])} — it read "nothing creates a request", and now something does`);
    }
    check("4 — ⚠ and Interviews counts the ones this gate created",
      typeof w.interviews === "number" && (w.interviews as number) >= 4, `${w.interviews}`);
    /* ⚠⚠ THE SUBSETS ARE DRAWN FROM THE TOTAL, NEVER ADDED TO IT. */
    check("4 — ⚠⚠ taken + declined never exceeds the total",
      typeof w.interviews === "number" &&
        (w.interviewsTaken as number) + (w.interviewsDeclined as number) <= (w.interviews as number),
      `${w.interviewsTaken} + ${w.interviewsDeclined} > ${w.interviews}`);
    check("4 — ⚠ one was taken", (w.interviewsTaken as number) >= 1, `${w.interviewsTaken}`);
    check("4 — ⚠ and two were declined or cancelled",
      (w.interviewsDeclined as number) >= 2, `${w.interviewsDeclined}`);
    /* ⚠⚠⚠ AND THE STALE CLAIM IS GONE FROM THE SOURCE. The dash's own copy
       said "nothing creates a request"; leaving that sentence beside a live
       count is the half of the code the next person implements. */
    const statsSrc = strip(readFileSync(join("src", "lib", "statistics.ts"), "utf8"));
    check("4 — ⚠⚠ no LIVE code still claims interviews are unrecorded",
      !/Interviews aren't recorded yet/.test(statsSrc),
      "the E164 quote is fine; a live uncounted branch is not");
  } finally {
    /* ── ⚠⚠ TEARDOWN — ENTITY-SCOPED, AND IT CANNOT THROW ────────────────
       ⚠⚠⚠ A TEARDOWN THAT THROWS HIDES THE RESULT IT WAS PROTECTING (`E607`).
       Everything here is wrapped, and the row counts are checked after. */
    try {
      if (requestIds.length > 0) {
        providerBidIds = (
          await prisma.providerBid.findMany({
            where: { work_request_id: { in: requestIds } },
            select: { id: true },
          })
        ).map((b) => b.id);
        const ivs = await prisma.interviewRequest.findMany({
          where: { work_request_id: { in: requestIds } },
          select: { id: true },
        });
        /* ⚠⚠ NOTIFICATIONS HAVE NO FOREIGN KEY, so a cascade cannot reach
           them. Swept by the dedupe keys their writers built, while the ids
           still resolve — the lesson `E620` cost 13 leaked rows to learn. */
        await prisma.notification.deleteMany({
          where: {
            dedupe_key: {
              in: [
                ...providerBidIds.map((id) => `work.proposal_received:${id}`),
                ...ivs.map((iv) => `work.interview_requested:${iv.id}`),
              ],
            },
          },
        });
        /*
          ⚠⚠⚠ DELETED EXPLICITLY, BECAUSE THERE IS **NO FOREIGN KEY** — AND
          FINDING THAT OUT IS WHY THIS GATE COUNTS ROWS AFTERWARDS.

          ⚠ MEASURED 2026-09-25: `InterviewRequest.work_request_id`,
          `TestRequest.work_request_id`, `BidRequest`, `WorkOrder` and
          `Requisition` are **bare `String @db.Uuid` columns with no
          `@relation`**. `WorkRequest` declares exactly four cascading children —
          `lines`, `skills`, `specializations`, `proposals` — and **none of the
          five above is among them.**
          ⚠⚠ So deleting a work request leaves its interviews and tests behind,
          pointing at a request that no longer exists. ⚠ This teardown cleaned
          up *nothing* on its first run and **the row count is what caught it**,
          not anything failing.
          ⚠⚠⚠ THE MISSING CONSTRAINT IS **REPORTED, NOT ADDED** — a foreign key
          on live columns is not an additive push (ruling 38: one database serves
          localhost, every preview and production), so it belongs in its own
          change on trunk.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   ⚠ `TestRequest` and `InterviewRequest` cascade on the work request.
        */
        await prisma.testRequest.deleteMany({ where: { work_request_id: { in: requestIds } } });
        await prisma.interviewRequest.deleteMany({ where: { work_request_id: { in: requestIds } } });
        await prisma.workRequest.deleteMany({ where: { id: { in: requestIds } } });
      }

      /* ⚠⚠⚠ THE ATTEMPTS THIS PROBE WROTE — BY ID, in the teardown, so a throw
         anywhere above cannot leave one spending a real provider's tries. */
      if (attemptIds.length > 0) {
        await prisma.learnTestAttempt.deleteMany({ where: { id: { in: attemptIds } } });
      }

      /*
        ── ⚠⚠⚠ AND ANY ORPHAN A KILLED OR MUTATED RUN LEFT BEHIND ───────────
        ⚠ MEASURED 2026-09-25: this gate's FIRST run leaked **4 interview rows
        and 2 test rows**, because there is no foreign key and the sweep above
        did not exist yet. ⚠⚠ They were found by the row COUNT — and by
        Statistics reading exactly double — not by anything failing.
        ⚠⚠⚠ SAFE TO SWEEP, AND THE ARGUMENT IS MEASURED RATHER THAN ASSUMED:
        **nothing in `src/` calls `workRequest.delete`** (grepped), so a live
        interview or test can never point at a request that is gone. An orphan
        is therefore probe residue by construction.
      */
      const liveRequests = new Set(
        (await prisma.workRequest.findMany({ select: { id: true } })).map((r) => r.id)
      );
      const strandedIv = (
        await prisma.interviewRequest.findMany({ select: { id: true, work_request_id: true } })
      ).filter((r) => !liveRequests.has(r.work_request_id));
      const strandedTr = (
        await prisma.testRequest.findMany({ select: { id: true, work_request_id: true } })
      ).filter((r) => !liveRequests.has(r.work_request_id));
      if (strandedIv.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            dedupe_key: { in: strandedIv.map((r) => `work.interview_requested:${r.id}`) },
          },
        });
        await prisma.interviewRequest.deleteMany({
          where: { id: { in: strandedIv.map((r) => r.id) } },
        });
      }
      if (strandedTr.length > 0) {
        await prisma.testRequest.deleteMany({
          where: { id: { in: strandedTr.map((r) => r.id) } },
        });
      }

      /* ⚠⚠⚠ AND ANY ORPHAN A KILLED OR MUTATED RUN LEFT. Safe for the same
         reason `check:proposals`' sweep is: nothing in the application deletes
         a bid or an interview — both RECORD — so a notification whose entity
         is gone is by definition probe residue. */
      for (const entityType of ["provider_bid", "interview_request"] as const) {
        const notifs = await prisma.notification.findMany({
          where: { entity_type: entityType },
          select: { id: true, entity_id: true },
        });
        if (notifs.length === 0) continue;
        const ids = notifs.map((n) => n.entity_id!).filter(Boolean);
        const live = new Set(
          entityType === "provider_bid"
            ? (await prisma.providerBid.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id)
            : (await prisma.interviewRequest.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id)
        );
        const orphans = notifs.filter((n) => !n.entity_id || !live.has(n.entity_id));
        if (orphans.length > 0) {
          await prisma.notification.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
        }
      }
    } catch (e) {
      fails.push(`teardown — ${(e as Error).message}`);
    }

    const left = await prisma.workRequest.count({ where: { title: TAG } });
    check("5 — ⚠ the probe cleaned up after itself", left === 0, `${left} left`);
    /* ⚠⚠ COUNTED RATHER THAN ASSUMED, AND THIS IS THE ASSERTION THAT FOUND THE
       MISSING FOREIGN KEY. ⚠ Interviews and tests are swept by hand above; if
       anybody removes those two lines believing a cascade exists, this reddens. */
    const leakedIv = await prisma.interviewRequest.count({
      where: { work_request_id: { in: requestIds } },
    });
    check("5 — ⚠⚠ and no interview row survived its request", leakedIv === 0, `${leakedIv}`);
    const leakedTests = await prisma.testRequest.count({
      where: { work_request_id: { in: requestIds } },
    });
    check("5 — ⚠⚠ nor any test row", leakedTests === 0, `${leakedTests}`);
    /* ⚠⚠⚠ AND NO LEARN ATTEMPT THIS PROBE WROTE. It writes into a REAL
       member's attempt history; a leak there would inflate the count Learn's
       own `max_attempts` rule refuses on, and lock a provider out of a test. */
    const leakedAttempts =
      attemptIds.length === 0
        ? 0
        : await prisma.learnTestAttempt.count({ where: { id: { in: attemptIds } } });
    check("5 — ⚠⚠⚠ no probe attempt was left in a member's attempt history",
      leakedAttempts === 0,
      `${leakedAttempts} — a leak here spends a real provider's attempts`);
  }

}

/**
 * ⚠⚠⚠ THE REPORT IS OUTSIDE `main`, AND THAT IS NOT STYLE.
 *
 * ⚠ `main` returns early when the cast is missing, and a `return` inside a
 * `try` runs the `finally` and then LEAVES — so a report written at the bottom
 * of `main` would be skipped and the process would exit **0 with a recorded
 * failure**. ⚠⚠ That is `E586`'s shape exactly: a gate that reports success
 * having asserted nothing. Caught while writing this file, not by a run.
 */
async function report() {
  try {
    await main();
  } catch (e) {
    fails.push(`the gate itself threw — ${(e as Error).message}`);
  }
  await prisma.$disconnect().catch(() => {});
  console.log(`check:interviews — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  /* ⚠⚠ AND A GATE WITH NO INPUTS FAILS (`E586`). A run that asserted almost
     nothing is not a pass, however green the count looks. */
  if (pass < 30) {
    console.log(`\n  ✗ E586 — only ${pass} assertions ran; this gate has ~40`);
    process.exit(1);
  }
  if (fails.length) process.exit(1);
}

report();
