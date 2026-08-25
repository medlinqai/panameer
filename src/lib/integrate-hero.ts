import { prisma } from "@/lib/prisma";

/**
 * `/integrate`'s HERO CONTENT AND ITS TWO HONEST COUNTS (`P1-J0-E325`/`E327`).
 *
 * ── ⚠⚠ THE THREE METHODS AND THE SENTENCE THAT NAMES THEM LIVE TOGETHER ─────
 *
 * The `Integration Methods` tile must read `3` because Scott's own sub-copy names
 * three — cXML, APIs and email. ⚠ THE TILE IS `INTEGRATION_METHODS.length`, NEVER
 * A TYPED `3`, so adding a fourth method to the array moves the tile.
 *
 * ⚠ THE SENTENCE IS **NOT** INTERPOLATED FROM THE ARRAY, AND THAT IS DELIBERATE.
 * His string is *"...like cXML, APIs, and email"* — Oxford comma, `and`, curly
 * apostrophe in `Panameer's`. Rebuilding that from a `join()` would mean CC
 * choosing his punctuation. ⚠ THE DRIFT PROTECTION IS CO-LOCATION: the array and
 * the sentence are adjacent in one file, so a change to one has the other in view.
 */
export const INTEGRATION_METHODS = ["cXML", "APIs", "email"] as const;

/**
 * ⚠ SCOTT'S SUB-COPY, VERBATIM, INCLUDING THE CURLY APOSTROPHE.
 *
 * ⚠⚠ `in minutes` IS A TESTABLE CLAIM AND NOTHING BEHIND IT IS BUILT. There is no
 * `Integration` model, no punchout endpoint, no cXML handler — the schema has none
 * of it. Same class as `in under one minute` on `/talent`, except THAT one was
 * measured and this one cannot be, because there is nothing to time. ⚠ SHIPPED AS
 * WRITTEN AND ON THE PRE-LAUNCH LIST.
 */
export const INTEGRATE_SUB =
  "Integrate seamlessly with Panameer’s AI Platform in minutes using mature technologies like cXML, APIs, and email";

export type IntegrateStat = { value: string; label: string };

/** ⚠ Plurals off the number, never off a hardcoded label. */
const plural = (n: number, singular: string) =>
  n === 1 ? singular : `${singular}s`;

/**
 * ── ⚠⚠ TWO TILES, NOT THREE, AND THE THIRD IS A MISSING MODEL ──────────────
 *
 * Scott asked for three: Integrations, service work requests, and service PRODUCT
 * work requests. The first two have honest sources. ⚠ THE THIRD DOES NOT EXIST:
 * nothing in `schema.prisma` links a `WorkRequest` to a `Package`. There is no
 * join table, no nullable `package_id`, no discriminator on `WorkRequest` — so
 * "how many work requests are for a service product" is not a question the
 * database can answer.
 *
 * ⚠ A TILE READING `0`, OR ONE COUNTING PLAIN `WorkRequest` ROWS UNDER A LABEL
 * THAT SAYS `Service Product`, IS WORSE THAN TWO TILES. Two ship. What the third
 * would need is in the brief report.
 *
 * ⚠ BUILD-TIME READ. Reading the database in a server component does not make a
 * route dynamic — only reading request-time data does. `/integrate` stays `○`.
 */
export async function integrateHeroStats(): Promise<IntegrateStat[]> {
  const workRequests = await prisma.workRequest.count();

  const all: IntegrateStat[] = [
    {
      value: String(INTEGRATION_METHODS.length),
      label: plural(INTEGRATION_METHODS.length, "Integration Method"),
    },
    {
      value: String(workRequests),
      label: plural(workRequests, "Work Request"),
    },
  ];

  /*
    ── ⚠⚠ AND THE SECOND TILE COLLAPSED TOO, BECAUSE THE COUNT IS GENUINELY 0 ──

    `workRequest.count()` READ 0 ON 2026-08-25. The brief's own rule about the
    third tile — *"a tile reading `0` ... is worse than two tiles"* — applies to
    this one with full force, and it is the same fact `/explore?mode=work` already
    states out loud: *"No Work Requests are open yet — Panameer is pre-launch."*
    ⚠ A PUBLIC COUNTER READING ZERO IS A TESTABLE NEGATIVE CLAIM, which is the
    class Scott has been clearest about.

    ⚠ SO ZERO-VALUED TILES ARE FILTERED, NOT HARDCODED AWAY. The moment the first
    work request is posted this tile appears on its own, with no code change. That
    is why the filter is here and not a deleted array entry.
  */
  return all.filter((s) => s.value !== "0");
}
