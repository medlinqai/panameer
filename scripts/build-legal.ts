/**
 * Turn the adapted legal source text into renderable content modules
 * (brief_legal_pages_content WS-A).
 *
 * Run:  npm run legal:build          (writes src/content/legal/*.ts)
 *       npm run legal:build -- --report   (also prints what it dropped)
 *
 * WHY A GENERATOR AND NOT A RUNTIME MARKDOWN READER. Three reasons, in order of
 * how much they'd cost to get wrong:
 *
 *   1. The output is committed, so every structural decision this script makes
 *      is visible in a diff. These are legal documents; "what exactly does the
 *      page say" has to be answerable by reading the repo, not by running it.
 *   2. No new dependency. The source is not really markdown — it is PDF-extracted
 *      plain text with one `#` line — so a markdown library would parse the
 *      whole document as a single paragraph and none of its features would earn
 *      their bundle size.
 *   3. No filesystem read at request time, and no `scripts/` directory needed in
 *      the deployed image.
 *
 * THIS SCRIPT NEVER CHANGES WORDS. It only decides what is a heading, where
 * paragraphs break, and which regions did not survive extraction. Every wording
 * change (Provider/Work Order/brand) was made in the source `.md` files, so it
 * shows up in `git diff` on the text itself rather than being buried in a
 * transform.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Node =
  | { t: "h2" | "h3" | "h4"; text: string }
  | { t: "p"; text: string }
  /** A region of the source that arrived unreadable — see `isShredded`. */
  | { t: "gap"; lines: number };

const REPORT = process.argv.includes("--report");

/* ---------------------------------------------------------------- helpers -- */

const isHeading = (line: string): 2 | 3 | 4 | null => {
  /*
    A NUMBERED LINE THAT ENDS IN A FULL STOP IS A LIST ITEM, NOT A HEADING.
    Section 5 of the Privacy Policy enumerates the rights a user can exercise —
    "1. The categories of personal information we have collected about you." —
    and without this test each one was promoted to an h2, restarting the
    document's numbering in the middle of a section. No heading in either
    document ends in a full stop.
  */
  if (/[.!?]$/.test(line)) return null;
  // "1. INFORMATION COLLECTION" / "3.5 Other uses that aren't allowed"
  const numbered = /^(\d+(?:\.\d+)*)\.?\s+\S/.exec(line);
  if (numbered && line.length < 90) {
    const depth = numbered[1].split(".").length;
    return depth === 1 ? 2 : depth === 2 ? 3 : 4;
  }
  // "a. Information You Provide to Us"
  if (/^[a-z]\.\s+\S/.test(line) && line.length < 90) return 3;
  // "TABLE OF CONTENTS" — all-caps standalone
  if (/^[A-Z][A-Z\s,'&/-]{3,60}$/.test(line.trim())) return 2;
  return null;
};

/**
 * Is this block a shard of a shredded table rather than prose?
 *
 * The source PDFs contained multi-column tables, and pdf-to-text shredded them
 * CELL BY CELL: every cell became its own line with a blank line after it,
 * interleaved across columns, so row structure is not recoverable by any
 * parser — "Identifiers", "Name, Date of Birth, Social Media", "Directly from
 * You", "Developing," are four different columns of one row, in source order.
 *
 * A shard is short, and either doesn't finish a sentence or is far too brief to
 * be one ("Obligations." is a cell, not a paragraph). The test is deliberately
 * conservative: prose is long, so real text cannot trip it, and the RUN rule
 * below means a stray short line still has to have neighbours to be dropped.
 */
const isShard = (lines: string[]): boolean => {
  if (lines.length > 2) return false;
  if (isHeading(lines[0])) return false;
  const text = lines.join(" ");
  if (text.length >= 60) return false;
  return !/[.!?]$/.test(text) || text.length < 30;
};

/**
 * How many shards make a table, and how far apart they may sit.
 *
 * Four, because genuine prose never produces four one-line stubs in a stretch,
 * while a lone short line ("bankruptcy.") is a wrapped sentence tail and must
 * survive.
 *
 * The proximity allowance is what catches the SECOND table. Its rows are a
 * short label beside a long description, so the labels are shards but the
 * descriptions are not, and a strictly-consecutive rule stopped at the first
 * description and left the rest of the table rendering as prose — a run of
 * sentence halves ("Information and", "disclose Non-Identifying Information
 * (including…", "De-Identified") that read as gibberish. Shards separated by a
 * block or two are one table, and everything between them belongs to it.
 */
const SHRED_RUN = 4;
const SHRED_GAP = 3;

/**
 * Rejoin hard-wrapped lines into paragraphs.
 *
 * The wrap width is measured from the document rather than assumed, and a line
 * that both ENDS A SENTENCE and is meaningfully shorter than that width is a
 * real paragraph end — the last line of a paragraph is the only one the wrapper
 * had no reason to fill. Sentences that merely happen to finish at the right
 * margin keep their paragraph, which is why the length test is there at all.
 */
function reflow(lines: string[], wrapWidth: number): string[] {
  const paras: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) paras.push(buf.join(" ").replace(/\s+/g, " ").trim());
    buf = [];
  };
  for (const line of lines) {
    buf.push(line);
    if (/[.!?]["')]?$/.test(line) && line.length < wrapWidth - 12) flush();
  }
  flush();
  return paras.filter(Boolean);
}

/* ------------------------------------------------------------------ parse -- */

function parse(raw: string, label: string): Node[] {
  const all = raw
    // The provenance header, stripped as a BLOCK. Matching only lines that
    // start with "<!--" silently published the continuation lines of a
    // multi-line comment as body paragraphs — the note about what was adapted
    // ended up inside the Terms of Use.
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .filter((l) => !/^#\s/.test(l)); // the H1 — the page renders its own

  const wrapWidth = Math.max(...all.map((l) => l.length));

  // Blank-line-separated blocks. The source uses blank lines between numbered
  // sections, not between paragraphs, which is why `reflow` exists at all.
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of all) {
    if (line.trim() === "") {
      if (cur.length) blocks.push(cur);
      cur = [];
    } else cur.push(line.trim());
  }
  if (cur.length) blocks.push(cur);

  /*
    THE SOURCE TABLE OF CONTENTS IS DROPPED. Its entries are bare heading lines,
    so they would render as two dozen duplicate headings — or, because the ToS
    runs its contents into the paragraph above with no blank line, as one jammed
    paragraph. The page builds its own contents list from the headings it
    actually has, which is the same information and cannot drift from the
    document under it.

    Dropped LINE-WISE rather than block-wise for exactly that reason: in the ToS
    the list is not a block of its own. It starts at the "Contents" line and
    runs while the lines keep looking like entries.
  */
  const kept = blocks.map((block) => {
    const start = block.findIndex((l) => /^(contents|table of contents)$/i.test(l));
    if (start === -1) return block;
    let end = start + 1;
    while (end < block.length && isHeading(block[end])) end++;
    return [...block.slice(0, start), ...block.slice(end)];
  }).filter((b) => b.length > 0);

  const nodes: Node[] = [];
  let droppedLines = 0;
  const droppedSamples: string[] = [];

  /**
   * Emit one prose block, promoting every heading line inside it.
   *
   * HEADINGS ARE NOT ONLY THE FIRST LINE. The source puts a section heading and
   * the section under it in the same blank-line-delimited block, so keying off
   * `block[0]` alone found "1. INFORMATION COLLECTION" and then buried "a.
   * Information You Provide to Us" — and every 1.x.y sub-heading — inside a
   * paragraph. Scanning each line finds them all.
   *
   * HEADINGS ALSO WRAP. The extractor wrapped them at the PDF's heading column,
   * which is much narrower than the body text, so "1.4 You can use Panameer to
   * share your content with" / "the world" arrived as two lines and the orphan
   * half was swallowed by the paragraph after it. A short line following a
   * heading that doesn't end in punctuation is the rest of that heading.
   */
  const emitBlock = (block: string[]) => {
    let body: string[] = [];
    const flushBody = () => {
      for (const text of reflow(body, wrapWidth)) nodes.push({ t: "p", text });
      body = [];
    };
    for (let k = 0; k < block.length; k++) {
      const level = isHeading(block[k]);
      if (!level) {
        body.push(block[k]);
        continue;
      }
      flushBody();
      let text = block[k];
      const next = block[k + 1];
      // The continuation of an ALL-CAPS heading is itself all-caps, so it looks
      // like a heading too — "4. INFORMATION SHARING AND" / "DISCLOSURE" is one
      // title the extractor broke in half, not two sections.
      // The number stays on the first half ("4. INFORMATION SHARING AND"), so
      // the continuation is the one WITHOUT one — which also keeps two genuinely
      // adjacent numbered headings from being fused into a single title.
      const capsRun =
        /^[0-9.\s]*[A-Z][A-Z\s,'&/-]*$/.test(text) && /^[A-Z][A-Z\s,'&/-]+$/.test(next ?? "");
      if (!/[.!?:]$/.test(text) && next && next.length < 45 && (!isHeading(next) || capsRun)) {
        text = `${text} ${next}`;
        k++;
      }
      nodes.push({ t: `h${level}` as "h2" | "h3" | "h4", text });
    }
    flushBody();
  };

  /*
    Cluster the shards first, then treat each dense cluster's full span as one
    table. Done as a pass over indices rather than inline in the emit loop
    because a table's extent is only knowable from where its LAST shard falls —
    the description cell you are looking at is prose-shaped, and only the label
    three blocks later reveals it was a column.
  */
  const shardIdx = kept.map((b, i) => (isShard(b) ? i : -1)).filter((i) => i >= 0);
  const tables: { from: number; to: number }[] = [];
  for (let k = 0; k < shardIdx.length; ) {
    let end = k;
    while (end + 1 < shardIdx.length && shardIdx[end + 1] - shardIdx[end] <= SHRED_GAP) end++;
    if (end - k + 1 >= SHRED_RUN) tables.push({ from: shardIdx[k], to: shardIdx[end] });
    k = end + 1;
  }

  for (let i = 0; i < kept.length; i++) {
    const table = tables.find((t) => t.from === i);
    if (table) {
      const run = kept.slice(table.from, table.to + 1);
      const lines = run.reduce((n, b) => n + b.length, 0);
      droppedLines += lines;
      if (droppedSamples.length < 6) {
        droppedSamples.push(run.slice(0, 4).map((b) => b.join(" ")).join(" ⏐ "));
      }
      nodes.push({ t: "gap", lines });
      i = table.to;
      continue;
    }

    emitBlock(kept[i]);
  }

  /*
    TABLE-CELL REMNANTS. A few cells end in a period and are long enough to look
    like prose once `reflow` joins them, so they survive the shard test and sit
    BETWEEN two gaps — "Analytics, Security, Legal, Compliance and Regulatory
    Obligations." is one column of one row, not a sentence anybody wrote.
    Anything trapped between two halves of a shredded table belongs to the
    table: absorbed if it is short, or if it starts mid-sentence in lowercase.
    Prose can never match, because prose never has a gap on both sides.
  */
  for (let i = 1; i < nodes.length - 1; i++) {
    const [prev, node, next] = [nodes[i - 1], nodes[i], nodes[i + 1]];
    if (prev.t !== "gap" || next.t !== "gap" || node.t !== "p") continue;
    if (node.text.length > 120 && /^[A-Z"“(]/.test(node.text)) continue;
    droppedLines += 1;
    nodes.splice(i - 1, 3, { t: "gap", lines: prev.lines + next.lines + 1 });
    i -= 1;
  }

  if (REPORT) {
    const counts = nodes.reduce<Record<string, number>>((a, n) => {
      a[n.t] = (a[n.t] ?? 0) + 1;
      return a;
    }, {});
    console.log(`\n=== ${label} ===`);
    console.log("  nodes:", counts);
    console.log("  source lines dropped as unreadable:", droppedLines);
    for (const s of droppedSamples) console.log("    · " + s.slice(0, 110));
  }

  return nodes;
}

/* ----------------------------------------------------------------- emit ---- */

const SRC = join(process.cwd(), "scripts/data/legal");
const OUT = join(process.cwd(), "src/content/legal");
mkdirSync(OUT, { recursive: true });

const DOCS = [
  { file: "tos_panameer.md", out: "terms.ts", constName: "TERMS_DOC", label: "Terms of Use" },
  { file: "privacy_panameer.md", out: "privacy.ts", constName: "PRIVACY_DOC", label: "Privacy Policy" },
];

for (const doc of DOCS) {
  const nodes = parse(readFileSync(join(SRC, doc.file), "utf8"), doc.label);
  const banner =
    `// GENERATED by scripts/build-legal.ts from scripts/data/legal/${doc.file}.\n` +
    `// Do not edit by hand — edit the source text and re-run \`npm run legal:build\`.\n` +
    `// DRAFT CONTENT, PENDING LEGAL REVIEW. See brief_legal_pages_content.\n`;
  writeFileSync(
    join(OUT, doc.out),
    `${banner}import type { LegalNode } from "@/content/legal/types";\n\n` +
      `export const ${doc.constName}: LegalNode[] = ${JSON.stringify(nodes, null, 2)};\n`,
    "utf8"
  );
  console.log(`wrote src/content/legal/${doc.out} — ${nodes.length} nodes`);
}
