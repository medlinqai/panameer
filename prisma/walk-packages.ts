/**
 * brief_V verification walk: create → publish → renders in the profile catalog,
 * and the completeness/publish gate is untouched.
 *
 * Runs the SAME owner-scoped lib the API routes call, with a Viewer built from
 * a real seeded provider — so what this proves is what the UI does.
 * Throwaway: the package it creates is deleted at the end.
 */
import * as dotenv from "dotenv";
import path from "path";

// Same reason as seed.ts: bare ts-node bypasses prisma.config.ts, so without
// this the pg adapter falls back to localhost and ECONNREFUSEs.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import type { Viewer } from "../src/lib/access";
import {
  listOwnPackages,
  createPackage,
  updatePackage,
  deletePackage,
  setPackageStatus,
} from "../src/lib/packages";
import { getProviderProfileView } from "../src/lib/provider-profile-view";

const viewerFor = (userId: string): Viewer => ({
  userId,
  role: "USER",
  isSystemAdmin: false,
  isAdmin: false,
  isServiceBuyer: false,
  isServiceProvider: true,
  isServiceCoordinator: false,
  isSupport: false,
  pAccountId: null,
});

async function main() {
  const profile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: { not: undefined } } },
    include: { person: { select: { user_id: true, first_name: true } } },
    orderBy: { completeness: "desc" },
  });
  if (!profile?.person.user_id) throw new Error("No seeded provider found");

  const viewer = viewerFor(profile.person.user_id);
  const before = profile.completeness;
  console.log(
    `Provider: ${profile.person.first_name} (${profile.id}) — completeness ${before}%`
  );

  // 1. Create — defaults to DRAFT, milestones default to 50/50.
  const id = await createPackage(viewer, {
    title: "Install DocuSign for Oracle Cloud",
    summary:
      "Integrate Oracle Cloud with DocuSign, create a resource org, onboard up to 5 contract admins.",
    deliverables: [
      "Oracle Cloud ↔ DocuSign integration configured",
      "Resource organization created",
      "Up to 5 contract admins onboarded",
    ],
    durationWeeks: 5,
    priceCents: 4_000_000,
  });
  let mine = await listOwnPackages(viewer);
  const created = mine.find((p) => p.id === id)!;
  console.log(
    `1. create → status=${created.status} price=${created.priceCents} weeks=${created.durationWeeks} ` +
      `deliverables=${created.deliverables.length} milestones=[${created.milestones
        .map((m) => `${m.percent}% ${m.label}`)
        .join(", ")}]`
  );

  // 2. Draft is invisible to the buyer catalog.
  let view = await getProviderProfileView(profile.id, {
    viewerUserId: profile.person.user_id,
  });
  console.log(`2. draft in profile catalog → ${view!.packages.length} package(s)`);

  // 3. Milestones that don't sum to 100 are rejected.
  try {
    await updatePackage(viewer, id, {
      title: "Install DocuSign for Oracle Cloud",
      durationWeeks: 5,
      priceCents: 4_000_000,
      deliverables: ["x"],
      milestones: [
        { label: "Upfront", percent: 60 },
        { label: "On completion", percent: 30 },
      ],
    });
    console.log("3. FAIL — 90% total was accepted");
  } catch (e) {
    console.log(`3. sum-to-100 → rejected: "${(e as Error).message}"`);
  }

  // 4. Publish, then the buyer catalog shows it.
  await setPackageStatus(viewer, id, "PUBLISHED");
  view = await getProviderProfileView(profile.id, {
    viewerUserId: profile.person.user_id,
  });
  const shown = view!.packages.find((p) => p.id === id);
  console.log(
    `4. publish → catalog shows ${view!.packages.length}: "${shown?.title}" ` +
      `$${(shown!.priceCents! / 100).toLocaleString()} / ${shown?.durationWeeks}wk / ` +
      `${shown?.deliverables.length} deliverables / ${shown?.milestones
        .map((m) => `${m.percent}% ${m.label}`)
        .join(" · ")}`
  );

  // 5. An incomplete package cannot be published.
  const bareId = await createPackage(viewer, { title: "Bare package" });
  try {
    await setPackageStatus(viewer, bareId, "PUBLISHED");
    console.log("5. FAIL — an empty package published");
  } catch (e) {
    console.log(`5. publish gate → "${(e as Error).message}"`);
  }
  await deletePackage(viewer, bareId);

  // 6. Owner scoping — someone else's viewer cannot touch this package.
  const other = await prisma.person.findFirst({
    where: { user_id: { not: profile.person.user_id }, providerProfile: { isNot: null } },
    select: { user_id: true },
  });
  if (other?.user_id) {
    try {
      await deletePackage(viewerFor(other.user_id), id);
      console.log("6. FAIL — a foreign viewer deleted it");
    } catch (e) {
      console.log(`6. owner scope → foreign delete refused: "${(e as Error).message}"`);
    }
  }

  // 7. Completeness is untouched — packages must never move the publish gate.
  const after = await prisma.providerProfile.findUnique({
    where: { id: profile.id },
    select: { completeness: true },
  });
  console.log(
    `7. completeness ${before}% → ${after!.completeness}% (${
      before === after!.completeness ? "unchanged ✓" : "CHANGED ✗"
    })`
  );

  await deletePackage(viewer, id);
  mine = await listOwnPackages(viewer);
  console.log(`8. cleanup → ${mine.length} package(s) remain`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
