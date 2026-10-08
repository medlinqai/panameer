import { test } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/** ⚠ MEASUREMENT ONLY — `P2-A1.1-E739`, Scott's 2026-10-01 phone walk. */
test("measure the lead line and the top row at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await signIn(page);
  for (const [name, url] of [
    ["profile", "/profile"],
    ["community", "/connect/community"],
    ["hire", "/hire"],
    ["learn", "/learn"],
  ] as const) {
    const resp = await page.goto(url, { waitUntil: "networkidle" });
    console.log(`\n-- ${name}: ${url} -> ${page.url()} (${resp?.status()})`);
    const m = await page.evaluate(() => {
      const box = (el: Element | null) =>
        el ? (({ x, width, y }) => ({ x: +x.toFixed(1), width: +width.toFixed(1), y: +y.toFixed(1) }))(el.getBoundingClientRect()) : null;
      const lead = [...document.querySelectorAll("p")].find((p) =>
        p.textContent?.includes("Free as of")
      );
      const leadWrap = lead?.parentElement ?? null;
      const photo = document.querySelector(".pm-rail-photo");
      const top = document.querySelector(".pm-rail-top");
      const kids = top ? [...top.children].map((c) => ({ cls: c.className, box: box(c), bt: getComputedStyle(c).borderTopWidth, mt: getComputedStyle(c).marginTop })) : [];
      const h1 = document.querySelector("h1");
      const leadSibs = lead?.parentElement ? [...lead.parentElement.children].map((c) => ({ tag: c.tagName, cls: String(c.className).slice(0, 60), box: box(c) })) : [];
      const side = document.querySelector(".pm-rail-top .pm-side");
      const cp3 = document.querySelector(".pm-cp3");
      const cs = side ? getComputedStyle(side) : null;
      return {
        lead: box(lead ?? null),
        leadWrap: box(leadWrap),
        leadWrapCls: leadWrap?.className ?? null,
        leadBg: leadWrap ? getComputedStyle(leadWrap).backgroundColor : null,
        photo: box(photo),
        side: box(side),
        cp3: box(cp3),
        sideBorderTop: cs?.borderTopWidth ?? null,
        sideMarginTop: cs?.marginTop ?? null,
        topKids: kids,
        h1: box(h1), h1cls: h1?.className ?? null,
        leadSibs,
        bgAtY: (() => {
          const probe = (y: number) => {
            const el = document.elementFromPoint(5, y);
            let e: Element | null = el; 
            while (e) {
              const bg = getComputedStyle(e).backgroundColor;
              if (bg && bg !== "rgba(0, 0, 0, 0)") return { y, bg, cls: String(e.className).slice(0,50), tag: e.tagName };
              e = e.parentElement;
            }
            return { y, bg: "none", cls: "", tag: "" };
          };
          const l = lead?.getBoundingClientRect();
          const ph = photo?.getBoundingClientRect();
          return [ l ? probe(l.y - 30) : null, l ? probe(l.y + 5) : null, ph ? probe(ph.y - 8) : null, ph ? probe(ph.y + 20) : null ];
        })(),
        ancestors: (() => {
          const out: unknown[] = [];
          let el: Element | null = lead ?? null;
          for (let i = 0; el && i < 6; i++) {
            const cs = getComputedStyle(el);
            out.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), bg: cs.backgroundColor, box: box(el) });
            el = el.parentElement;
          }
          return out;
        })(),
        cp3Parent: box(cp3?.parentElement ?? null),
        cp3ParentCls: cp3?.parentElement?.className ?? null,
      };
    });
    console.log(`\n== ${name} (${url}) ==`);
    console.log(JSON.stringify(m, null, 1));
  }
});
