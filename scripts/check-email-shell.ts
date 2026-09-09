/**
 * `check:email-shell` — the logo an email actually renders, and the address it
 * actually claims (`P1-ALL-E402`). `npm run check:email-shell`.
 *
 * ── ⚠⚠ THIS GATE IS RED ON PURPOSE TODAY. READ WS-3 BEFORE "FIXING" IT ──────
 *
 * `PANAMEER_ADDRESS` is still `"Panameer Inc · address to be confirmed"` and
 * that string is in the footer of every email Panameer sends. **The address is
 * Scott's to supply.** This gate fails until he does, and turns green on the one
 * line change. ⚠⚠ DO NOT GO GREEN BY INVENTING AN ADDRESS — a plausible wrong
 * address is a false statement in a legally-required field, which is strictly
 * worse than an obviously unfinished one. ⚠ AND DO NOT DELETE THE LINE: that
 * turns a visible gap into an invisible one.
 *
 * ── WHAT ELSE IT DEFENDS ───────────────────────────────────────────────────
 *
 * ⚠ THE HEIGHT ATTRIBUTE IS ARITHMETIC ON A MEASURED FILE. `EMAIL_LOGO_INTRINSIC`
 * claims each mark's true pixel size; §2 below OPENS EACH PNG and reads its IHDR
 * header, so the claim cannot drift from the file. That is what makes deriving
 * safe when the asset is swapped — the alternative is `height="25"` for a 524×132
 * image, which is what shipped.
 *
 * ⚠ NO DATABASE AND NO BROWSER. Renders the real templates and reads real files.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  logoBlock,
  isEmailFetchableUrl,
  EMAIL_LOGO_INTRINSIC,
  EMAIL_LOGO_WIDTH,
  PANAMEER_ADDRESS,
  emailShell,
  footerText,
} from "@/lib/email/shell";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function walk(dir: string, out: { path: string; text: string; code: string }[] = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e)) {
      const text = readFileSync(full, "utf8");
      out.push({ path: relative(".", full), text, code: stripComments(text) });
    }
  }
  return out;
}
const SRC = walk("src");

/* ═══ 1 · WS-1 — THE FALLBACK FIRES ON UNREACHABLE, NOT ONLY ON ABSENT ══════
   ⚠ THE RULE IS PUBLIC ROUTABILITY OF THE HOST, NOT THE SCHEME. See the
   docblock on `isEmailFetchableUrl` for why "not localhost" and "https only"
   were both rejected. These cases ARE that rule, written down. */
{
  const FETCHABLE = [
    "https://panameer.com/brand/panameer-new-on-light.png",
    "https://mail.panameer.com/brand/panameer-new-on-light.png",
    /* ⚠ PLAIN HTTP ON A PUBLIC HOST PASSES — this is the staging case, and
       Outlook's proxy fetches it fine. Requiring TLS would hide a logo that
       renders, in the one environment where somebody is trying to look at it. */
    "http://staging.panameer.com/brand/panameer-new-on-light.png",
    "https://panameer-git-abc.vercel.app/brand/panameer-new-on-light.png",
    /* A public IPv4 literal is routable. */
    "http://203.0.113.9/brand/panameer-new-on-light.png",
  ];
  const UNFETCHABLE = [
    "http://localhost:3100/brand/panameer-new-on-light.png",
    "http://127.0.0.1:3100/brand/panameer-new-on-light.png",
    "http://[::1]:3100/brand/panameer-new-on-light.png",
    /* ⚠⚠ THE CASE "not localhost" WOULD HAVE MISSED — a dev opening the app
       from a phone on the same wifi. Same broken box, different host. */
    "http://192.168.1.14:3100/brand/panameer-new-on-light.png",
    "http://10.0.0.7:3100/brand/panameer-new-on-light.png",
    "http://172.20.1.1:3100/brand/panameer-new-on-light.png",
    "http://169.254.10.1/brand/panameer-new-on-light.png",
    "http://scotts-mac.local:3100/brand/panameer-new-on-light.png",
    "http://build.internal/brand/panameer-new-on-light.png",
    /* A bare hostname resolves only inside somebody's network. */
    "http://buildbox:3100/brand/panameer-new-on-light.png",
    /* Not absolute at all — resolves against the mail client, which serves nothing. */
    "/brand/panameer-new-on-light.png",
    "brand/panameer-new-on-light.png",
    "data:image/png;base64,iVBORw0KGgo=",
    "file:///Users/scott/logo.png",
    "",
  ];
  for (const u of FETCHABLE)
    check(`1 — fetchable: ${u}`, isEmailFetchableUrl(u));
  for (const u of UNFETCHABLE)
    check(`1 — NOT fetchable: ${u || "(empty)"}`, !isEmailFetchableUrl(u));
  check("1 — undefined is not fetchable", !isEmailFetchableUrl(undefined));
  check("1 — null is not fetchable", !isEmailFetchableUrl(null));

  /* ⚠ AND THE BLOCK ITSELF SWITCHES, not just the predicate. */
  check(
    "1 — a localhost URL renders the TEXT wordmark, not an img",
    !logoBlock("http://localhost:3100/brand/panameer-new-on-light.png").includes("<img") &&
      logoBlock("http://localhost:3100/brand/panameer-new-on-light.png").includes(">Panameer<")
  );
  check(
    "1 — no URL renders the TEXT wordmark",
    !logoBlock(undefined).includes("<img")
  );
  check(
    "1 — a public URL renders an img",
    logoBlock("https://panameer.com/brand/panameer-new-on-light.png").includes("<img")
  );
  /* ⚠ THE ATTRIBUTE IS ESCAPED. `appBaseUrl(origin)` can return a
     request-derived origin, so this is not always a compile-time constant. */
  check(
    "1 — the src attribute is escaped",
    !logoBlock('https://panameer.com/x.png?a="onerror=alert(1)').includes('"onerror')
  );
}

/* ═══ 2 · WS-2 — THE CLAIMED PIXEL SIZE IS THE FILE'S ACTUAL PIXEL SIZE ═════
   ⚠⚠ THE ASSERTION THIS FILE EXISTS FOR. A PNG's IHDR holds width and height as
   two big-endian uint32s at bytes 16..24. Reading them is what makes the derived
   height trustworthy: if somebody swaps the asset and forgets the table, this
   fails instead of squashing the mark in every email. */
{
  const pngSize = (path: string) => {
    const b = readFileSync(path);
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!b.subarray(0, 8).equals(sig)) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  };

  for (const [name, claimed] of Object.entries(EMAIL_LOGO_INTRINSIC)) {
    const actual = pngSize(join("public", "brand", name));
    check(
      `2 — ${name} is really ${claimed.w}×${claimed.h}`,
      !!actual && actual.w === claimed.w && actual.h === claimed.h,
      actual ? `file is ${actual.w}×${actual.h}` : "not a readable PNG"
    );
  }

  /* ⚠ THE NUMBER THAT SHIPPED WAS 25 AND THE ANSWER IS 45. Pinned as arithmetic
     on the measured file, not as a second typed constant: if the asset changes,
     §2 above fails first and this follows the file. */
  const light = EMAIL_LOGO_INTRINSIC["panameer-new-on-light.png"];
  const expected = Math.round((EMAIL_LOGO_WIDTH * light.h) / light.w);
  const html = logoBlock("https://panameer.com/brand/panameer-new-on-light.png");
  check(
    `2 — the on-light mark renders height="${expected}"`,
    html.includes(`height="${expected}"`),
    html.match(/height="\d+"/)?.[0] ?? "no height attribute"
  );
  check(
    "2 — ABSENCE: the wrong height 25 is gone from the rendered block",
    !html.includes('height="25"')
  );
  /* ⚠⚠ THE TWO MARKS ARE NOT THE SAME SHAPE (524×132 vs 529×134), so one
     hardcoded height was always wrong for one of them. This is the assertion
     that the derivation is PER-ASSET rather than a single shared number. */
  const darkHtml = logoBlock("https://panameer.com/brand/panameer-new-on-dark.png");
  const dark = EMAIL_LOGO_INTRINSIC["panameer-new-on-dark.png"];
  check(
    "2 — the on-dark mark derives its OWN height, and it differs",
    darkHtml.includes(`height="${Math.round((EMAIL_LOGO_WIDTH * dark.h) / dark.w)}"`) &&
      Math.round((EMAIL_LOGO_WIDTH * dark.h) / dark.w) !== expected
  );
  /* ⚠ AN UNRECOGNISED ASSET EMITS NO HEIGHT rather than a guessed one. */
  check(
    "2 — an unknown asset emits no height attribute",
    !/height="\d+"/.test(logoBlock("https://panameer.com/brand/other.png"))
  );

  /* ⚠⚠ AND NO TEMPLATE CARRIES ITS OWN COPY ANY MORE. Three did — this file,
     project-validation and project-validated — each with the same wrong 25. */
  const inline = SRC.filter(
    (f) => f.path.includes("email/") && /const logoBlock = logoUrl/.test(f.code)
  );
  check(
    "2 — ABSENCE: no template re-implements logoBlock",
    inline.length === 0,
    inline.map((i) => i.path).join(", ")
  );
  const typed = SRC.filter(
    (f) => f.path.includes("email/") && /height="25"/.test(f.code)
  );
  check(
    "2 — ABSENCE: nothing in email/ types height=\"25\"",
    typed.length === 0,
    typed.map((t) => t.path).join(", ")
  );

  /* ⚠ EVERY SENDER NAMES AN ASSET THE TABLE KNOWS, so "unrecognised" — which
     silently drops the height attribute — cannot ship unnoticed. */
  const referenced = new Set<string>();
  for (const f of SRC)
    for (const m of f.code.matchAll(/\/brand\/(panameer-new-on-[a-z]+\.png)/g))
      referenced.add(m[1]);
  const unknown = [...referenced].filter((r) => !(r in EMAIL_LOGO_INTRINSIC));
  check(
    "2 — every hotlinked mark has a measured intrinsic size",
    unknown.length === 0,
    unknown.join(", ")
  );
}

/* ═══ 3 · WS-3 — NO PLACEHOLDER IN THE FOOTER ADDRESS ══════════════════════ */
{
  const PLACEHOLDER = /\b(to be confirmed|tbd|todo|tba|xxx+|coming soon|placeholder|lorem)\b/i;
  check(
    "3 — ⚠ PANAMEER_ADDRESS is a real address, not a placeholder",
    !PLACEHOLDER.test(PANAMEER_ADDRESS),
    `still ${JSON.stringify(PANAMEER_ADDRESS)} — Scott must supply the registered postal address`
  );
  /* ⚠ AND THE LINE IS STILL THERE. Deleting it would turn this red gate green
     while REMOVING a CAN-SPAM-required footer element — the worst of both. */
  check(
    "3 — the address line still exists and is non-trivial",
    PANAMEER_ADDRESS.trim().length > 10
  );
  /* ⚠⚠ RENDERED, NOT GREPPED — AND THIS ASSERTION WAS WORTHLESS FIRST TIME.
     It read the source for `${PANAMEER_ADDRESS}` and passed, because
     `footerText()` contains that same token: deleting the address from the HTML
     footer left the text twin's copy behind and the check never noticed. Found
     by mutation-testing it. Both footers are now RENDERED and inspected, which
     is the only form of this test that can fail. */
  const rendered = emailShell({
    logoUrl: "https://panameer.com/brand/panameer-new-on-light.png",
    bodyHtml: "<p>body</p>",
    year: 2026,
  });
  check("3 — the HTML footer prints the address", rendered.includes(PANAMEER_ADDRESS));
  check("3 — the text footer prints the address", footerText(2026).includes(PANAMEER_ADDRESS));
}

/* ═══ 4 · THE SEVEN HOTLINKERS ARE REPOINTED (`P1-ALL-E403`) ═══════════════

   ⚠ SUPERSEDED, quoted not deleted, because it is the record of why this
   waited: *"⚠⚠ NOT REPOINTED. The app renders the E397 lockups; email still
   renders the old looped-P `panameer-new-on-light.png`. Repointing means mail
   sent today does not match mail sent last week; not repointing means outgoing
   mail misrepresents the product. That trade is Scott's and he has not
   answered. ⚠ THIS PINS THE STATUS QUO so the decision is taken, not drifted
   into."*

   ⚠⚠ HE ANSWERED IT: repoint to the v2 lockup, NOT to `E397`'s
   `panameer-lockup-on-light.png`, which `E400` superseded. So the same tripwire
   now pins the answer — and §2 above is what made the swap safe, because the
   height is derived from the file rather than carried over. */
{
  const oldMark = SRC.filter((f) =>
    /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-new-on-(light|dark)\.png`/.test(f.code)
  );
  check(
    "4 — ABSENCE: no sender hotlinks the OLD looped-P mark",
    oldMark.length === 0,
    oldMark.map((h) => h.path).join(", ")
  );
  /* ⚠ AND NOT THE E397 LOCKUP EITHER. It is superseded, it is a different
     aspect (4.85 vs 5.91), and pointing email at it would be a second wrong
     mark rather than the current one. */
  const superseded = SRC.filter((f) =>
    /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-lockup-on-(light|dark)\.png`/.test(f.code)
  );
  check(
    "4 — ABSENCE: no sender hotlinks the superseded E397 lockup",
    superseded.length === 0,
    superseded.map((h) => h.path).join(", ")
  );
  const v2 = SRC.filter((f) =>
    /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-lockup-ink\.png`/.test(f.code)
  );
  check(
    "4 — the email senders hotlink the v2 lockup (6 files)",
    v2.length === 6,
    `${v2.length} files: ${v2.map((h) => h.path).join(", ")}`
  );
  const sites = SRC.reduce(
    (n, f) => n + [...f.code.matchAll(/\/brand\/panameer-lockup-ink\.png`/g)].length,
    0
  );
  check("4 — exactly 7 call sites", sites === 7, `${sites}`);
  /* ⚠⚠ AND THE MARK THE SENDERS NAME MUST BE IN THE INTRINSIC TABLE, or §2's
     derivation silently drops the height attribute on every email. This is the
     assertion that ties the repoint to the geometry. */
  check(
    "4 — the repointed mark has a measured intrinsic size",
    "panameer-lockup-ink.png" in EMAIL_LOGO_INTRINSIC
  );
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (failures.length) {
  console.error(`\ncheck:email-shell — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:email-shell — ${pass}/${pass} passed`);
