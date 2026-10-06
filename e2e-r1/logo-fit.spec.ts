import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { db } from "../e2e-shell/_db";
import { signIn } from "./_fixture";
import { createCompanyFixture, dropCompanyFixture, type CoFixture } from "./_company";

// check:logo-fit: wide (5:1), tall (1:3) and square logos show whole — fit inside, never clipped — everywhere.
let f: CoFixture | null = null;
let wrId = "";
const SHAPES = { wide: [500, 100], tall: [100, 300], square: [200, 200] } as const;
const dataUri = async (w: number, h: number) => {
  // A border in a second color makes any clipping visible in screenshots.
  const png = await sharp({ create: { width: w, height: h, channels: 4, background: "#0f766e" } })
    .composite([{ input: await sharp({ create: { width: w - 8, height: h - 8, channels: 4, background: "#d72cd6" } }).png().toBuffer(), top: 4, left: 4 }])
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
};

test.beforeAll(async () => {
  f = await createCompanyFixture();
  const wr = await db().workRequest.create({
    data: { buyer_person_id: f.people.admin.personId, p_account_id: f.pAccountId, title: "Logo-fit test request", status: "POSTED", posted_at: new Date(), proposal_access: "OPEN" },
    select: { id: true },
  });
  wrId = wr.id;
});
test.afterAll(async () => {
  if (f) await db().workRequest.deleteMany({ where: { buyer_person_id: f.people.admin.personId } });
  await dropCompanyFixture(f);
});

async function wholeLogos(page: Page, where: string) {
  const imgs = page.locator("[data-logo-img]");
  await expect(imgs.first(), where).toBeVisible({ timeout: 30_000 });
  const r = await imgs.evaluateAll((els) =>
    els.map((img) => {
      const i = img as HTMLImageElement;
      const box = i.getBoundingClientRect();
      const tile = i.closest("[data-logo-tile]")!.getBoundingClientRect();
      const fit = getComputedStyle(i).objectFit;
      const ratio = i.naturalWidth / i.naturalHeight;
      // Rendered content size under object-fit: contain.
      const scale = Math.min(box.width / i.naturalWidth, box.height / i.naturalHeight);
      const cw = i.naturalWidth * scale, ch = i.naturalHeight * scale;
      const inside = box.left >= tile.left - 0.5 && box.right <= tile.right + 0.5 && box.top >= tile.top - 0.5 && box.bottom <= tile.bottom + 0.5;
      const bg = getComputedStyle(i.closest("[data-logo-tile]")!).backgroundColor;
      return { bg, fit, inside, ratio: Math.round(ratio * 100) / 100, contentRatio: Math.round((cw / ch) * 100) / 100, loaded: i.complete && i.naturalWidth > 0 };
    })
  );
  for (const x of r) {
    expect(x.loaded, `${where} loaded`).toBe(true);
    expect(x.fit, `${where} object-fit`).toBe("contain");
    expect(x.bg, `${where} white tile`).toBe("rgb(255, 255, 255)");
    expect(x.inside, `${where} inside its tile`).toBe(true);
    expect(Math.abs(x.contentRatio - x.ratio), `${where} aspect kept`).toBeLessThan(0.05);
  }
}

for (const [shape, [w, h]] of Object.entries(SHAPES))
  for (const scheme of ["light", "dark"] as const)
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }])
      test(`${shape} logo ${vp.width} ${scheme}`, async ({ browser }) => {
        await db().company.update({ where: { id: f!.companyId }, data: { logo_url: await dataUri(w, h) } });
        const ctx = await browser.newContext({ colorScheme: scheme, viewport: vp });
        const page = await ctx.newPage();
        await signIn(page, f!.people.admin.email);
        for (const path of ["/company", "/company/branding"]) {
          await page.goto(path, { waitUntil: "networkidle" });
          await wholeLogos(page, path);
          await page.locator("[data-logo-box]").first().screenshot({ path: `e2e-r1/.artifacts/logo-${shape}-${path.replace(/\//g, "_")}-${vp.width}-${scheme}.png` });
        }
        await ctx.close();
        const o = await browser.newContext({ colorScheme: scheme, viewport: vp });
        const op = await o.newPage();
        await signIn(op, f!.people.loner.email);
        for (const path of [`/companies/${f!.companyId}`, `/find-work/${wrId}`]) {
          await op.goto(path, { waitUntil: "networkidle" });
          await wholeLogos(op, path);
        }
        await o.close();
      });
