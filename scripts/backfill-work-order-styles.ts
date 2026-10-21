// WS-E001: set `style` on Work Requests and Work Orders from their lines. Dry run writes a CSV; --apply writes.
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { styleForLines } from "../src/lib/work-order-styles";

(async () => {
  const apply = process.argv.includes("--apply");
  const subs = new Set((await prisma.serviceProduct.findMany({ where: { pricing_type: "RECURRING" }, select: { id: true } })).map((p) => p.id));
  const lineSel = { select: { transaction_type: true, billing_cycle: true, uom: true, service_product_id: true } } as const;
  const [wrs, wos] = await Promise.all([
    prisma.workRequest.findMany({ where: { style: null }, select: { id: true, wr_number: true, lines: lineSel } }),
    prisma.workOrder.findMany({ where: { style: null }, select: { id: true, order_number: true, lines: lineSel } }),
  ]);
  const rows = ["kind,number,id,lines,style"];
  const todo: { kind: "WR" | "WO"; id: string; style: NonNullable<ReturnType<typeof styleForLines>> }[] = [];
  for (const [kind, list] of [["WR", wrs], ["WO", wos]] as const) {
    for (const d of list) {
      const style = styleForLines(d.lines.map((l) => ({ ...l, recurringProduct: !!l.service_product_id && subs.has(l.service_product_id) })));
      const number = "wr_number" in d ? d.wr_number : (d as { order_number: string }).order_number;
      rows.push(`${kind},${number ?? ""},${d.id},${d.lines.length},${style ?? "(no lines)"}`);
      if (style) todo.push({ kind, id: d.id, style });
    }
  }
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/work_order_styles_dryrun.csv", rows.join("\n") + "\n");
  const tally = todo.reduce<Record<string, number>>((m, t) => ((m[`${t.kind} ${t.style}`] = (m[`${t.kind} ${t.style}`] ?? 0) + 1), m), {});
  console.log(JSON.stringify({ workRequests: wrs.length, workOrders: wos.length, toSet: todo.length, tally }, null, 1));
  if (apply) {
    for (const t of todo) {
      if (t.kind === "WR") await prisma.workRequest.update({ where: { id: t.id }, data: { style: t.style } });
      else await prisma.workOrder.update({ where: { id: t.id }, data: { style: t.style } });
    }
    console.log("APPLIED", todo.length);
  } else console.log("DRY RUN — scripts/out/work_order_styles_dryrun.csv");
  await prisma.$disconnect();
  process.exit(0);
})();
