import { woMoney } from "@/lib/wo-money";

// Work Order Plan lane 1: the header's arithmetic.
let pass = 0;
const fails: string[] = [];
const check = (n: string, ok: boolean, d = "") => (ok ? pass++ : fails.push(`${n}${d ? " — " + d : ""}`));
const base = { nteCents: 150000, valueCents: 150000, paidCents: 20000, approvedUnpaidCents: 30000, awaitingApprovalCents: 10000, hoursAuthorized: 10, hoursLogged: 6.5, periodStart: "2026-10-01", periodEnd: "2026-10-31", today: "2026-10-04" };
const m = woMoney(base);
check("1 — left to be paid = cap − paid − approved-unpaid − awaiting", m.leftToPayCents === 90000, String(m.leftToPayCents));
check("2 — the cap is the not-to-exceed when there is one", m.capCents === 150000);
check("3 — no cap falls back to the order value", woMoney({ ...base, nteCents: null, valueCents: 80000 }).capCents === 80000);
check("4 — never negative when over-billed", woMoney({ ...base, paidCents: 200000 }).leftToPayCents === 0);
check("5 — hours left = authorized − logged", m.hoursLeft === 3.5, String(m.hoursLeft));
check("6 — hours left never negative", woMoney({ ...base, hoursLogged: 12 }).hoursLeft === 0);
check("7 — no hourly lines → hours unknown, not zero", woMoney({ ...base, hoursAuthorized: null }).hoursLeft === null);
check("8 — days left counts calendar days to the end date", m.daysLeft === 27, String(m.daysLeft));
check("9 — after the end date it is 0, not negative", woMoney({ ...base, today: "2026-11-05" }).daysLeft === 0);
check("10 — no end date → unknown", woMoney({ ...base, periodEnd: null }).daysLeft === null);
check("11 — fractional hours round to 2 places", woMoney({ ...base, hoursLogged: 1 / 3 }).hoursLogged === 0.33);
check("12 — the parts never exceed the cap in the sum shown", m.paidCents + m.approvedUnpaidCents + m.awaitingApprovalCents + m.leftToPayCents === m.capCents);
if (fails.length) {
  console.log(`check:wo-money — ${fails.length} FAILED, ${pass} passed\n`);
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`check:wo-money — all ${pass} passed`);
