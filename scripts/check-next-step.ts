import { nextStep, type MemberFacts, type SellerFacts } from "@/lib/next-step";

// E872: nextStep() — one fixture per rule row, first-match order, both-sided member, missing counts.
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => (ok ? pass++ : fails.push(`${name}${why ? ` — ${why}` : ""}`));

const seller = (o: Partial<SellerFacts> = {}): SellerFacts => ({
  published: true, recruiter: false, resumeHref: "/join/provider?step=skills", resumeLabel: "Skills",
  stepsDone: 3, stepsTotal: 6, months: 120, projects: 10, credentials: 2, skills: 11, colleagues: 4,
  sellsPackages: false, matchingRequests: 12, roleNames: [], ...o,
});
const m = (o: Partial<MemberFacts>): MemberFacts => ({ firstName: "Pat", firstVisit: true, seller: null, buyer: null, ...o });
const all = (r: ReturnType<typeof nextStep>) => JSON.stringify(r);

// Rule rows.
const r1 = nextStep(m({ seller: seller({ published: false }) }));
check("1 — unpublished seller → Finish your profile", r1.card.rule === 1 && r1.card.cta.href === "/join/provider?step=skills");
check("1 — why says buyers can't find you", /can't find you until it's published/.test(r1.card.why) && /3 of 6/.test(r1.card.why));
check("1 — unpublished recruiter also finishes first", nextStep(m({ seller: seller({ published: false, recruiter: true }) })).card.rule === 1);

const r2 = nextStep(m({ seller: seller({ months: 14, projects: 0, credentials: 0, colleagues: 0 }) }));
check("2 — little experience → Learn", r2.card.rule === 2 && r2.card.cta.href === "/learn");
check("2 — why is derived history, not a self-grade", /work history shows 1 year of work and no projects yet/.test(r2.card.why) && !/Beginner|told us|chose/i.test(all(r2)));
check("2 — < 2 projects alone triggers it", nextStep(m({ seller: seller({ projects: 1 }) })).card.rule === 2);
check("2 — 3+ years and 2 projects does not", nextStep(m({ seller: seller({ months: 40, projects: 2, colleagues: 1 }) })).card.rule === 4);
check("2 — Then lists Connect and Find Work", r2.then.map((t) => t.rule).join() === "3,4", r2.then.map((t) => t.rule).join());

const r3 = nextStep(m({ seller: seller({ colleagues: 0 }) }));
check("3 — experienced, no colleagues → Connect", r3.card.rule === 3 && r3.card.cta.href === "/connect");
check("3 — why uses projects + skills", /10 projects and 11 skills/.test(r3.card.why) && /no colleagues yet/.test(r3.card.why));
check("3 — first colleague stops rule 3", nextStep(m({ seller: seller({ colleagues: 1 }) })).card.rule === 4);

const r4 = nextStep(m({ seller: seller({ sellsPackages: true }) }));
check("4 — set up + connected → Find work", r4.card.rule === 4 && r4.card.cta.href === "/find-work");
check("4 — real matching count", /12 open requests match your skills/.test(r4.card.line));
check("4 — sells packages → List a service in Then", r4.then.some((t) => t.title === "List a service you sell"));

const r5 = nextStep(m({ seller: seller({ recruiter: true, months: 0, projects: 0, colleagues: 0, roleNames: ["Project-Specific"] }) }));
check("5 — recruiter → Search talent (skips 2–4)", r5.card.rule === 5 && r5.card.cta.href === "/search");
check("5 — why names their roles", /recruit for Project-Specific/.test(r5.card.why));

const r6 = nextStep(m({ buyer: { openRequest: { id: "wr1", title: "Supplier onboarding", matches: 7, invited: 0 } } }));
check("6 — buyer with a request → its matches", r6.card.rule === 6 && r6.card.title === "7 providers match your request" && r6.card.cta.href === "/work-requests/wr1/invite");
check("6 — invited tick", r6.card.ticks.some((t) => t.label === "Providers invited: 0" && !t.done));
check("6 — greeting says the request is posted", r6.greeting.eyebrow === "Your request is posted");

const r7 = nextStep(m({ buyer: { openRequest: null } }));
check("7 — buyer, no request → Post (free)", r7.card.rule === 7 && /free/.test(r7.card.title));
check("7 — why", r7.card.why === "Posting is free; matches show right away.");

// First-match order and both-sided members.
const both = nextStep(m({ seller: seller({ colleagues: 0 }), buyer: { openRequest: { id: "wr2", title: "X", matches: 3, invited: 1 } } }));
check("order — seller rules first for a both-sided member", both.card.rule === 3);
check("order — buyer rule 6 shows in Then", both.then.some((t) => t.rule === 6), both.then.map((t) => t.rule).join());
check("order — Then is at most 3 rows", nextStep(m({ seller: seller({ projects: 0, colleagues: 0, sellsPackages: true }), buyer: { openRequest: { id: "w", title: "", matches: 1, invited: 0 } } })).then.length <= 3);
check("order — unpublished beats everything", nextStep(m({ seller: seller({ published: false, colleagues: 0 }), buyer: { openRequest: null } })).card.rule === 1);

// Missing counts are left out, never shown as zero.
const miss = nextStep(m({ seller: seller({ matchingRequests: null, credentials: null, months: null, projects: 0 }) }));
check("missing — no fake credentials tick", !miss.card.ticks.some((t) => /Credentials/.test(t.label)));
check("missing — no dated history says so", /no dated work history yet/.test(miss.card.why));
const miss4 = nextStep(m({ seller: seller({ matchingRequests: null }) }));
check("missing — rule 4 without a count shows no number", !/\d+ open request/.test(all(miss4)) && !miss4.card.ticks.some((t) => /Matching/.test(t.label)));
const miss6 = nextStep(m({ buyer: { openRequest: { id: "w", title: "", matches: null, invited: null } } }));
check("missing — rule 6 without counts", miss6.card.title === "See who matches your request" && !miss6.card.ticks.some((t) => /invited/.test(t.label)));
check("missing — rule 1 without step counts", !/of \d/.test(nextStep(m({ seller: seller({ published: false, stepsDone: null }) })).card.why));

// Greeting.
check("greeting — first visit seller", nextStep(m({ seller: seller() })).greeting.title === "Welcome to Panameer, Pat." && nextStep(m({ seller: seller() })).greeting.eyebrow === "Your profile is live");
check("greeting — later visits", nextStep(m({ firstVisit: false, seller: seller() })).greeting.title === "Welcome back, Pat.");

console.log(`check:next-step — ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  ✗ ${f}`);
process.exit(fails.length ? 1 : 0);
