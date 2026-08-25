import { prisma } from "@/lib/prisma";

/**
 * `/integrate`'s HERO CONTENT AND ITS THREE COUNTER TILES (`P1-J0-E327`).
 *
 * ── ⚠⚠ ONE LIVE READ AND TWO NAMED STUBS. SCOTT'S LABELS, HIS DECISION ─────
 *
 * `integrate-walk1` shipped a single `Integration Methods = 3` tile. ⚠ THAT WAS A
 * SUBSTITUTION HE NEVER ASKED FOR — it counted the methods Panameer SUPPORTS, not
 * the integrations it HAS, and the label quietly moved to fit the number. It is
 * gone. His three labels ship, with the two that have no model stubbed at `0`.
 *
 *     tile                            source                          state
 *     ─────────────────────────────── ─────────────────────────────── ──────────
 *     Integrations                    STUB_INTEGRATIONS               ⚠ STUB
 *     Service Work Requests           prisma.workRequest.count()      ✅ LIVE
 *     Service Product Work Requests   STUB_SERVICE_PRODUCT_REQUESTS   ⚠ STUB
 *
 * ⚠ `0` IS HONEST AND `0` SHIPS. No "coming soon", no em dash, no hidden tile
 * because its number is unflattering. ⚠ AND THE WALK-1 FILTER THAT DROPPED
 * ZERO-VALUED TILES IS REMOVED — it was the right call when the tile was CC's
 * substitution and the wrong one now that the labels and the zeros are Scott's.
 *
 * ⚠ THE LIVE ONE READS 0 TODAY TOO. `workRequest.count()` was 0 on 2026-08-25 —
 * which `/explore?mode=work` already says out loud: *"No Work Requests are open yet
 * — Panameer is pre-launch."* ⚠ SO ALL THREE RENDER `0`, AND EXACTLY ONE OF THEM
 * WILL MOVE ON ITS OWN. That is the difference the code has to make obvious, and it
 * is why the stubs are named constants rather than literals.
 */

/**
 * ⚠⚠ STUB — NOT A LIVE READ. There is no `Integration` model in `schema.prisma`:
 * no table, no connector row, nothing that records an ERP having been connected.
 *
 * ⚠ THE QUERY THAT REPLACES THIS, THE DAY THE MODEL LANDS:
 *
 *     await prisma.integration.count({ where: { status: "ACTIVE" } })
 *
 * ⚠ `status` MATTERS AND IS NOT DECORATION — a half-configured connector is not an
 * integration, and counting rows rather than ACTIVE rows is how this tile would
 * start overstating on day one. Delete the constant, do not repoint it.
 */
export const STUB_INTEGRATIONS = 0;

/**
 * ⚠⚠ STUB — NOT A LIVE READ, AND IT IS THE HARDER OF THE TWO. Nothing in
 * `schema.prisma` links a `WorkRequest` to a `Package`: no join table, no nullable
 * `package_id`, no discriminator. So "how many work requests are for a service
 * product" is not a question the database can answer at all — this is a MISSING
 * RELATION, not a missing count.
 *
 * ⚠ THE QUERY THAT REPLACES THIS, ONCE THE RELATION EXISTS:
 *
 *     await prisma.workRequest.count({ where: { package_id: { not: null } } })
 *
 * ⚠ THE CHEAPEST WAY TO GET THERE IS A NULLABLE `package_id` ON `WorkRequest` — a
 * request either references a product or it does not. The alternative, a
 * `WorkRequestKind` enum, also answers it and is a bigger change. ⚠ EITHER IS A
 * SCHEMA MIGRATION, which is why this is a stub and not a query today.
 */
export const STUB_SERVICE_PRODUCT_REQUESTS = 0;

/**
 * ⚠ THE THREE TECHNOLOGIES SCOTT'S SUB-COPY NAMES. Still here because
 * `integrate-steps.ts` step 1 names the same three and the two must not disagree
 * about what Panameer speaks.
 *
 * ⚠⚠ IT NO LONGER FEEDS A COUNTER TILE. `integrate-walk1` used `.length` as
 * `Integration Methods = 3`; that tile is gone, because METHODS SUPPORTED IS NOT
 * INTEGRATIONS HELD and the label had been bent to fit the only number available.
 * ⚠ DO NOT WIRE IT BACK TO A TILE.
 */
export const INTEGRATION_METHODS = ["cXML", "APIs", "email"] as const;

/**
 * ⚠ SCOTT'S SUB-COPY, VERBATIM, INCLUDING THE CURLY APOSTROPHE.
 *
 * ⚠⚠ `in minutes` IS A TESTABLE CLAIM AND NOTHING BEHIND IT IS BUILT — no
 * `Integration` model, no punchout endpoint, no cXML handler. Unlike `/talent`'s
 * `in under one minute`, this one cannot even be timed, because there is nothing to
 * time. ⚠ SHIPPED AS WRITTEN AND ON THE PRE-LAUNCH LIST.
 */
export const INTEGRATE_SUB =
  "Integrate seamlessly with Panameer’s AI Platform in minutes using mature technologies like cXML, APIs, and email";

export type IntegrateStat = {
  value: string;
  label: string;
  /** ⚠ TRUE = a placeholder, not a measurement. Rendered identically; the flag is
   *  for whoever reads this next, and for the guard. */
  stub: boolean;
};

/** ⚠ Plurals off the number, never off a hardcoded label. */
const plural = (n: number, singular: string) =>
  n === 1 ? singular : `${singular}s`;

/**
 * ⚠ BUILD-TIME READ. Reading the database in a server component does not make a
 * route dynamic — only reading REQUEST-time data does. ⚠ MEASURED: `/integrate`
 * stays `○` before and after.
 */
export async function integrateHeroStats(): Promise<IntegrateStat[]> {
  /* ⚠ THE ONLY LIVE QUERY IN THIS FUNCTION. */
  const serviceWorkRequests = await prisma.workRequest.count();

  return [
    {
      value: String(STUB_INTEGRATIONS),
      label: plural(STUB_INTEGRATIONS, "Integration"),
      stub: true,
    },
    {
      value: String(serviceWorkRequests),
      label: plural(serviceWorkRequests, "Service Work Request"),
      stub: false,
    },
    {
      value: String(STUB_SERVICE_PRODUCT_REQUESTS),
      label: plural(
        STUB_SERVICE_PRODUCT_REQUESTS,
        "Service Product Work Request",
      ),
      stub: true,
    },
  ];
}
