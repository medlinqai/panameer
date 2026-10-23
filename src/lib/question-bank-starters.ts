import type { Question } from "@/lib/question-types";

// QB-E004: the three Panameer Starters (code, not data) — quick, scored questions a buyer can load and edit.
const yn = (text: string, yesPts = 5, noKnockout = false): Question => ({ text, type: "YES_NO", options: [{ label: "Yes", points: yesPts }, { label: "No", points: 0, knockout: noKnockout }] });
const pick = (text: string, opts: [string, number][]): Question => ({ text, type: "PICK_ONE", options: opts.map(([label, points]) => ({ label, points })) });
export const STARTER_BANKS: { id: string; name: string; questions: Question[] }[] = [
  { id: "starter-p2p", name: "P2P Functional", questions: [
    pick("Full Oracle Fusion P2P implementations you led", [["0", 0], ["1–2", 2], ["3–5", 4], ["6+", 5]]),
    yn("Have you configured Self-Service Procurement and Purchasing approvals in Fusion?"),
    pick("Payables invoice processing you've set up", [["Manual only", 1], ["Imaging / IDR", 3], ["IDR plus a third-party OCR", 5]]),
    { text: "Rate your Fusion Procurement setup skills", type: "SCALE", points: 5 },
    { text: "Years of hands-on Oracle Cloud P2P work", type: "NUMBER" },
  ] },
  { id: "starter-tech", name: "Oracle Technical / Integrations", questions: [
    pick("Oracle Integration Cloud (OIC) integrations you've built to production", [["0", 0], ["1–5", 2], ["6–20", 4], ["20+", 5]]),
    yn("Have you built BI Publisher / OTBI reports for Fusion?"),
    { text: "Which have you used in production?", type: "PICK_SEVERAL", options: [{ label: "FBDI", points: 1 }, { label: "REST APIs", points: 1 }, { label: "HCM Data Loader", points: 1 }, { label: "VBCS", points: 1 }, { label: "SOAP Web Services", points: 1 }] },
    { text: "Rate your PL/SQL", type: "SCALE", points: 5 },
  ] },
  { id: "starter-pmo", name: "Project / PMO", questions: [
    pick("Oracle Cloud projects you've run as PM", [["0", 0], ["1–2", 2], ["3–5", 4], ["6+", 5]]),
    yn("Have you run cutover and hypercare for a go-live?"),
    pick("Largest team you've led", [["Under 5", 1], ["5–15", 3], ["16–40", 4], ["40+", 5]]),
    yn("Can you work in US Eastern business hours?", 5, true),
    { text: "Your approach to a slipping milestone, in two lines", type: "SHORT_TEXT" },
  ] },
];
