import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Assign each Learning Path its real instructor (brief_learn_experience WS6).
 *
 *   npm run seed:learn-experts
 *
 * ONE INSTRUCTOR OWNS A WHOLE PATH — Scott's rule, and the reason the LP card
 * can show a face at all. The previous state was worse than a placeholder: 22
 * of 23 paths had NO expert, so the catalog rendered as a wall of blank purple
 * tiles, and the one thing this platform is actually selling — that a working
 * consultant teaches this — was invisible.
 *
 * The mapping below is BY EXPERTISE, read off the instructors' own live
 * provider profiles, not spread round-robin to make the grid look populated:
 *
 *   Eddie Cairnie    — "Oracle Cloud Finance Expert"; GL, Payables, Cash
 *                      Management, Fixed Assets, Accounting Hub.
 *   Linus Erley      — "Supply Chain Expert"; Inventory, Item Costing,
 *                      Supplier Registration, Catalogs, Negotiations, PIM.
 *   Marelise Steenkamp — "Oracle Cloud P2P/HCM Techno-Functional Consultant";
 *                      Benefits, Procurement, Contracts, Sourcing, Payments.
 *
 * Anyone teaching a path they could not actually deliver would be a lie told to
 * a buyer evaluating them, which is the opposite of what WS7's profile↔courses
 * loop is for.
 *
 * IDEMPOTENT and NON-DESTRUCTIVE: it matches paths by title, skips any path
 * that already has an expert (an admin's choice in the console wins over this
 * file), and reports anything it couldn't place.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Path title → the instructor's email, so the mapping is readable at a glance. */
const EDDIE = "sw_user3@straterp.com";
const LINUS = "sw_user2@straterp.com";
const MARELISE = "sw_user4@straterp.com";

const ASSIGNMENT: Record<string, string> = {
  // Finance and accounting — Eddie.
  "Basic Payables": EDDIE,
  Journals: EDDIE,
  "Cost Accounting": EDDIE,

  // Supply chain, and the foundational/onboarding paths — Linus.
  "1. Background": LINUS,
  "2. Overview": LINUS,
  "3. Roles & Careers": LINUS,
  "4. How to Login & Get Started": LINUS,
  "Inventory Management": LINUS,
  "Supplier Integration": LINUS,
  "How to Configure": LINUS,
  "How to Deploy Procurement": LINUS,
  "How to Implement": LINUS,
  Beginners: LINUS,
  Implementers: LINUS,
  ERP: LINUS,

  // P2P and HCM — Marelise.
  "Basic Procurement": MARELISE,
  "Advanced Procurement": MARELISE,
  "Contract Management": MARELISE,
  "End-to-End Business Processing (Buying Channels)": MARELISE,
  "Core HR": MARELISE,
  "Benefits Admin": MARELISE,
  "Talent Mgmt": MARELISE,
  "Payroll Mgmt": MARELISE,
};

async function main() {
  const emails = [...new Set(Object.values(ASSIGNMENT))];
  const people = await prisma.person.findMany({
    where: { user: { email: { in: emails } } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      photo_url: true,
      user: { select: { email: true } },
    },
  });
  const byEmail = new Map(people.map((p) => [p.user!.email, p]));

  for (const email of emails) {
    const p = byEmail.get(email);
    if (!p) {
      console.log(`  ! no Person for ${email} — paths assigned to them will be skipped`);
    } else if (!p.photo_url) {
      // Worth saying out loud: the whole point of WS6 is the face, so an
      // instructor without a photo assigned to a path is a silent regression
      // back to a blank tile.
      console.log(`  ! ${p.first_name} ${p.last_name} has NO PHOTO — their cards will show initials`);
    }
  }

  const paths = await prisma.learningPath.findMany({
    select: { id: true, title: true, expert_person_id: true },
  });

  let assigned = 0;
  let kept = 0;
  const unplaced: string[] = [];

  for (const lp of paths) {
    const email = ASSIGNMENT[lp.title];
    if (!email) {
      unplaced.push(lp.title);
      continue;
    }
    if (lp.expert_person_id) {
      kept++;
      continue;
    }
    const person = byEmail.get(email);
    if (!person) continue;

    await prisma.learningPath.update({
      where: { id: lp.id },
      data: { expert_person_id: person.id },
    });
    console.log(`  ${lp.title.padEnd(48)} → ${person.first_name} ${person.last_name}`);
    assigned++;
  }

  console.log(`\nassigned: ${assigned}  already had an expert: ${kept}`);
  if (unplaced.length > 0) {
    console.log(`not in the mapping (left alone): ${unplaced.join(", ")}`);
  }

  const still = await prisma.learningPath.count({ where: { expert_person_id: null } });
  console.log(`paths still without an instructor: ${still}`);
  await prisma.$disconnect();
}

void main();
