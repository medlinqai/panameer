import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ServiceUnit, WorkMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { saveCatalogService, publishCatalog } from "@/lib/build-catalog";
import { uploadProfilePhoto } from "@/lib/storage";
import { TestAccountError } from "./test-accounts";
import { writeAudit } from "./audit";

// TD-E001: 16 Oracle consultants + 5 other businesses + 2 buyers, all is_test, each seller live per lib/visibility.ts.
// Idempotent by email: an existing account is skipped. Remove with Admin › Remove Test Accounts.

type Rate = { group: string; type: string; cents: number; hours?: number };
type Product = { bt: string; type: string; title: string; summary: string; cents: number | null; monthly?: boolean; agent?: boolean; lead: number; cover: string; offers?: boolean };
type Seller = {
  nn: number; first: string; last: string; title: string; city: string; state: string; area: string; company: string; bts: string[];
  roles: string[]; skills: string[]; modes: [WorkMode, string][]; rates: Rate[]; products: Product[]; photo?: string; about: string;
};
type Buyer = { nn: number; first: string; last: string; title: string; city: string; state: string; area: string; company: string };

const CS = "PANAMEER_V1"; // Technology › Corporate Systems
const T = "ERP & Oracle"; // SH2-E001: Technology's rates now live under ERP & Oracle
const func = (offsite: number): Rate[] => [
  { group: T, type: "Offsite Hourly", cents: offsite * 100 },
  { group: T, type: "Onsite Hourly", cents: (offsite + 20) * 100 },
  { group: T, type: "Monthly Retainer", cents: offsite * 100 * 100, hours: 100 },
];
const tech = (offsite: number): Rate[] => [{ group: T, type: "Offsite Hourly", cents: offsite * 100 }];
// Technology's rate types have no Day Rate, so leads get Offsite Hourly + Monthly Retainer.
const lead = (offsite: number, monthly: number): Rate[] => [
  { group: T, type: "Offsite Hourly", cents: offsite * 100 },
  { group: T, type: "Monthly Retainer", cents: monthly * 100, hours: 120 },
];
const p = (type: string, title: string, summary: string, dollars: number, lead: number, cover: string, extra: Partial<Product> = {}): Product => ({ bt: CS, type, title, summary, cents: dollars * 100, lead, cover, ...extra });
const IMPL: [WorkMode, string][] = [["IMPLEMENT", "Functional Consultant"]];
const TECH: [WorkMode, string][] = [["IMPLEMENT", "Technical Consultant / Developer"]];
const SUPPORT: [WorkMode, string][] = [["SUPPORT", "Application Support Analyst"]];
const APP = ["APPLICATION_SPECIFIC"];
const TEC = ["TECHNOLOGY_SPECIFIC"];

export const MARKETPLACE_SELLERS: Seller[] = [
  { nn: 38, first: "Eli", last: "Brooks", title: "Oracle P2P Functional Consultant", city: "Atlanta", state: "GA", area: "404", company: "Brooks Advisory LLC", bts: [CS], roles: APP, modes: IMPL, photo: "Eli.png",
    skills: ["Purchase Orders", "Self-Service Procurement", "Sourcing", "Supplier Management", "Procurement Contracts", "Payables"], rates: func(155),
    products: [p("Health Checks & Assessments", "P2P Health Check", "Two-week review of your Oracle P2P setup, approvals and match rules, with a fix list.", 4500, 10, "P2P"), p("AI Agents", "Invoice Match Exception Agent", "Watches 3-way match holds daily and tells AP which ones to release, and why.", 299, 5, "AIM", { monthly: true, agent: true })],
    about: "Oracle Procure-to-Pay lead for mid-size and enterprise clients; requisition to payment, end to end." },
  { nn: 39, first: "Mark", last: "Ellison", title: "Oracle P2P Technical Consultant", city: "Dallas", state: "TX", area: "214", company: "Ellison Tech LLC", bts: [CS], roles: TEC, modes: TECH, photo: "mark.png",
    skills: ["FBDI", "Oracle Integration Cloud", "BI Publisher", "OTBI", "Approvals Management Extensions", "Flexfields"], rates: tech(135),
    products: [p("Conversions (Data Loads)", "Supplier Conversion (FBDI)", "Suppliers, sites and contacts loaded through FBDI, with a reconciliation report.", 3800, 10, "SUP"), p("Extensions & Workflows", "PO Approval Workflow Extension", "Approval rules built and tested in BPM for your PO hierarchy.", 2900, 7, "WF")],
    about: "Builds P2P integrations, conversions and reports on Oracle Fusion." },
  { nn: 40, first: "Susan", last: "Park", title: "Oracle R2R Functional Consultant", city: "Chicago", state: "IL", area: "312", company: "Park Finance Consulting LLC", bts: [CS], roles: APP, modes: [["IMPLEMENT", "Functional Consultant"], ["SUPPORT", "Application Support Analyst"]], photo: "Susan.png",
    skills: ["General Ledger", "Payables", "Receivables", "Assets", "Cash Management", "Subledger Accounting", "Intercompany"], rates: func(165),
    products: [p("Configuration & Setup", "Month-End Close Configuration", "Close calendar, period controls and allocations set up and tested in Oracle GL.", 6500, 15, "R2R"), p("Health Checks & Assessments", "GL Health Check", "Review of ledgers, chart of accounts and close steps with a ranked fix list.", 3900, 10, "GL")],
    about: "Record-to-Report specialist: GL, AP, AR and Fixed Assets on Oracle Cloud." },
  { nn: 41, first: "Todd", last: "Reyes", title: "Oracle R2R Technical Consultant", city: "Denver", state: "CO", area: "303", company: "Reyes Data LLC", bts: [CS], roles: TEC, modes: TECH, photo: "todd.png",
    skills: ["FBDI", "ADFdi", "Financial Reporting Studio", "Smart View", "BI Publisher", "Oracle Integration Cloud"], rates: tech(140),
    products: [p("Reports", "Trial Balance Report Pack", "Five trial balance and journal reports in BI Publisher, ready for month end.", 1800, 5, "TB"), p("Integrations & Interfaces", "Bank Statement Integration", "Daily bank statement load into Cash Management through OIC.", 5200, 15, "BNK")],
    about: "Finance-side integrations, data loads and reporting for Oracle Fusion." },
  { nn: 42, first: "Maritza", last: "Alvarez", title: "Oracle SCM Functional Consultant", city: "Phoenix", state: "AZ", area: "602", company: "Alvarez Supply Chain LLC", bts: [CS], roles: APP, modes: IMPL, photo: "maritza.png",
    skills: ["Inventory Management", "Order Management", "Warehouse Management", "Supply Chain Orchestration", "Global Order Promising"], rates: func(150),
    products: [p("Configuration & Setup", "Inventory Setup Package", "Organizations, subinventories, item rules and transactions set up and tested.", 5500, 14, "INV"), p("Health Checks & Assessments", "Order-to-Ship Assessment", "Walk-through of order to shipment with gaps and quick wins named.", 4200, 10, "O2S")],
    about: "Oracle SCM consultant for inventory and order management rollouts." },
  { nn: 43, first: "Doug", last: "Hanley", title: "Oracle SCM Technical Consultant", city: "Charlotte", state: "NC", area: "704", company: "Hanley Systems LLC", bts: [CS], roles: TEC, modes: SUPPORT, photo: "dopug.png",
    skills: ["Functional Setup Manager", "Application Composer", "Oracle Integration Cloud", "FBDI", "OTBI"], rates: tech(120),
    products: [p("Dashboards & Analytics", "Inventory Dashboard", "On-hand, aging and movement in one OTBI dashboard.", 2400, 7, "DSH"), p("Conversions (Data Loads)", "Item Conversion (FBDI)", "Items and categories loaded through FBDI, with error clean-up.", 3500, 10, "ITM")],
    about: "Supports Oracle SCM after go-live: fixes, loads and dashboards." },
  { nn: 44, first: "Karen", last: "Webb", title: "Oracle HCM Functional Consultant", city: "Austin", state: "TX", area: "512", company: "Webb HR Systems LLC", bts: [CS], roles: APP, modes: IMPL, photo: "karen.png",
    skills: ["Global Human Resources", "Payroll", "Absence Management", "Time & Labor", "Benefits"], rates: func(160),
    products: [p("Health Checks & Assessments", "Payroll Readiness Assessment", "Parallel-run plan, element review and a go/no-go checklist for Oracle Payroll.", 4800, 10, "PAY"), p("Configuration & Setup", "Absence Plan Setup", "Accrual and leave plans configured and tested for your policies.", 3200, 7, "ABS")],
    about: "Core HR and Payroll implementations on Oracle HCM Cloud." },
  { nn: 45, first: "Raj", last: "Mehta", title: "Oracle HCM Technical Consultant", city: "Boston", state: "MA", area: "617", company: "Mehta Integrations LLC", bts: [CS], roles: TEC, modes: TECH,
    skills: ["HDL", "HSDL", "Payroll Batch Loader", "Oracle Integration Cloud", "BI Publisher", "Security Console"], rates: tech(150),
    products: [p("Conversions (Data Loads)", "Worker Load (HDL)", "Workers, assignments and salaries loaded through HDL with reconciliation.", 4000, 10, "HDL"), p("Extensions & Workflows", "Payroll Fast Formula Pack", "Up to five Fast Formulas written and tested for your pay rules.", 2600, 7, "FF")],
    about: "HCM data loads, Fast Formula and integrations." },
  { nn: 46, first: "Louisa", last: "Grant", title: "Oracle CX Functional Consultant", city: "Seattle", state: "WA", area: "206", company: "Grant CX Partners LLC", bts: [CS], roles: APP, modes: IMPL, photo: "Louisa.png",
    skills: ["Sales", "Fusion Service", "Digital Sales", "Customer Data Management", "Configure Price Quote"], rates: func(145),
    products: [p("Configuration & Setup", "Sales Pipeline Setup", "Opportunity stages, territories and forecasts set up in Oracle Sales.", 4500, 10, "CX"), p("AI Agents", "Service Request Triage Agent", "Reads new service requests, sets priority and routes them to the right queue.", 349, 5, "SRT", { monthly: true, agent: true })],
    about: "Oracle CX Sales and Service rollouts for B2B companies." },
  { nn: 47, first: "Omar", last: "Haddad", title: "Oracle CX Technical Consultant", city: "Raleigh", state: "NC", area: "919", company: "Haddad Digital LLC", bts: [CS], roles: TEC, modes: SUPPORT,
    skills: ["Application Composer", "Import Management (CX)", "Oracle Integration Cloud", "Redwood / Oracle JET", "Sandboxes"], rates: tech(130),
    products: [p("Conversions (Data Loads)", "Customer Import (CX)", "Accounts and contacts imported with duplicate checks.", 3200, 7, "IMP"), p("Integrations & Interfaces", "CX–ERP Order Integration", "Quotes in CX become sales orders in ERP through OIC.", 6800, 20, "INT")],
    about: "Keeps Oracle CX running: extensions, imports and integrations." },
  { nn: 48, first: "Evira", last: "Novak", title: "Oracle EPM Functional Consultant", city: "Tampa", state: "FL", area: "813", company: "Novak Planning LLC", bts: [CS], roles: APP, modes: IMPL, photo: "Evira.png",
    skills: ["Planning", "Financial Consolidation and Close", "Narrative Reporting", "Tax Reporting", "Account Reconciliation"], rates: func(175),
    products: [p("Health Checks & Assessments", "Planning Model Health Check", "Review of your EPM Planning model, rules and performance.", 5000, 10, "EPM"), p("Configuration & Setup", "Close Calendar Setup (FCCS)", "Consolidation close tasks and calendar set up in FCCS.", 6000, 15, "FCC")],
    about: "EPM Planning and FCCS lead for finance teams." },
  { nn: 49, first: "Ben", last: "Carter", title: "Oracle EPM Technical Consultant", city: "Nashville", state: "TN", area: "615", company: "Carter EPM Tech LLC", bts: [CS], roles: TEC, modes: TECH,
    skills: ["Smart View", "Financial Reporting Studio", "Oracle Integration Cloud", "FBDI", "ERP / HCM Cloud Adapters"], rates: tech(160),
    products: [p("Integrations & Interfaces", "EPM Data Integration Build", "GL actuals flowing into EPM on a schedule, with checks.", 5500, 15, "DI"), p("Extensions & Workflows", "EPM Automate Scripts", "Nightly jobs scripted with EPM Automate and logged.", 2200, 5, "AUT")],
    about: "EPM data integration and automation." },
  { nn: 50, first: "Priya", last: "Shah", title: "Oracle Cloud Project Manager (PMP)", city: "Columbus", state: "OH", area: "614", company: "Shah Delivery LLC", bts: [CS], roles: ["PROJECT_DELIVERY_LEAD"], modes: [["IMPLEMENT", "Project Manager"]],
    skills: ["Project Manager", "PMO Lead", "Cutover / Deployment Lead"], rates: lead(175, 18000),
    products: [p("Health Checks & Assessments", "Oracle Cloud Project Readiness Assessment", "Plan, team, risks and data readiness reviewed before you start.", 7500, 10, "PM")],
    about: "Runs Oracle Cloud projects from kickoff to hypercare." },
  { nn: 51, first: "Greg", last: "Holloway", title: "Oracle Program Director", city: "Minneapolis", state: "MN", area: "612", company: "Holloway Programs LLC", bts: [CS], roles: ["PROJECT_DELIVERY_LEAD"], modes: [["IMPLEMENT", "Program Management"]],
    skills: ["Program Management", "PMO Lead", "Project Manager", "Cutover / Deployment Lead"], rates: lead(225, 28000),
    products: [p("Health Checks & Assessments", "Program Health Check", "Independent review of a running Oracle program, with a recovery plan.", 12000, 15, "PGM"), p("AI Agents", "Variance Explainer Agent", "Explains budget-to-actual variances in plain words every month end.", 499, 5, "VAR", { monthly: true, agent: true })],
    about: "Directs multi-pillar Oracle Cloud programs." },
  { nn: 52, first: "Nina", last: "Torres", title: "Organizational Change & Training Lead", city: "San Diego", state: "CA", area: "619", company: "Torres Change LLC", bts: [CS], roles: ["CHANGE_ENABLEMENT_LEAD"], modes: [["IMPLEMENT", "Training Lead"]],
    skills: ["Training Lead", "Organizational Change Mgt", "Change Mgt Specialist", "Change Management & AI Adoption"], rates: lead(150, 14000),
    products: [p("Health Checks & Assessments", "Change Readiness Assessment", "Stakeholder map, impacts and a training plan for your go-live.", 5500, 10, "OCM")],
    about: "Change management and end-user training for ERP projects." },
  { nn: 53, first: "Sam", last: "Okafor", title: "Oracle Cloud Test Lead", city: "Philadelphia", state: "PA", area: "215", company: "Okafor QA LLC", bts: [CS], roles: ["TESTER_SUPPORT"], modes: [["IMPLEMENT", "Test Lead"]],
    skills: ["Test Lead", "Testing Specialist", "Support Specialist", "Quarterly Update Regression Testing", "Opkey"], rates: lead(130, 12000),
    products: [p("Health Checks & Assessments", "Quarterly Update Regression Test Pack", "Regression scripts run against each Oracle quarterly update, with a report.", 3500, 7, "QA"), p("Dashboards & Analytics", "UAT Defect Dashboard", "Defects by area, severity and age in one dashboard.", 1500, 5, "UAT")],
    about: "Test strategy, SIT/UAT and quarterly update regression." },
  // Non-Oracle businesses: their business types don't use skills, so the business type is their kind of work.
  { nn: 54, first: "Dave", last: "Ortiz", title: "Owner, Commercial Printer", city: "Jacksonville", state: "FL", area: "904", company: "Harbor Print Co.", bts: ["PRINT_PROMOTIONAL", "SIGNS_LARGE_FORMAT"], roles: [], skills: [], modes: [],
    rates: [{ group: "Printing", type: "Design Hourly", cents: 8500 }, { group: "Printing", type: "Rush Fee", cents: 7500 }],
    products: [
      { bt: "PRINT_PROMOTIONAL", type: "Business Cards (500)", title: "Business Cards (500)", summary: "500 full-colour cards on 16 pt stock, matte or gloss.", cents: 4900, lead: 3, cover: "BC" },
      { bt: "PRINT_PROMOTIONAL", type: "Brochures & Flyers", title: "Brochures & Flyers", summary: "Tri-fold brochures or flyers, 250 printed and folded.", cents: 35000, lead: 5, cover: "BRO" },
      { bt: "SIGNS_LARGE_FORMAT", type: "Vinyl Banner", title: "Vinyl Banner 3×6", summary: "3 × 6 ft outdoor vinyl banner with grommets.", cents: 12900, lead: 4, cover: "BAN" },
      { bt: "SIGNS_LARGE_FORMAT", type: "Trade Show Display", title: "Trade Show Display", summary: "10 ft pop-up display with printed graphic and case.", cents: 120000, lead: 10, cover: "TSD" },
    ], about: "Commercial printing and signs for Northeast Florida businesses." },
  { nn: 55, first: "James", last: "Patel", title: "Contract Project Manager (PMP)", city: "Charlotte", state: "NC", area: "980", company: "Patel PM Services", bts: ["CONTRACT_STAFFING"], roles: [], skills: [], modes: [],
    rates: [{ group: "Mentoring & Advisory", type: "Hourly Bill Rate", cents: 9500 }, { group: "Mentoring & Advisory", type: "Weekly Rate", cents: 360000 }],
    products: [], about: "Contract project manager for construction and IT projects." },
  { nn: 56, first: "Luis", last: "Romero", title: "Licensed HVAC Contractor", city: "Orlando", state: "FL", area: "407", company: "Romero Heating & Air", bts: ["HVAC"], roles: [], skills: [], modes: [],
    rates: [{ group: "Facilities", type: "Hourly Labor", cents: 11000 }, { group: "Facilities", type: "Per Visit", cents: 12900 }, { group: "Facilities", type: "Emergency Call-Out", cents: 22500 }],
    products: [
      { bt: "HVAC", type: "Seasonal Tune-Up", title: "Seasonal Tune-Up", summary: "Clean, check and tune one system before summer or winter.", cents: 14900, lead: 2, cover: "HV" },
      { bt: "HVAC", type: "Preventive Maintenance", title: "Preventive Maintenance", summary: "Monthly filter, coil and drain checks for one building.", cents: 8900, monthly: true, lead: 7, cover: "PM" },
      { bt: "HVAC", type: "HVAC Repair", title: "HVAC Repair", summary: "Diagnosis and repair, priced after the visit.", cents: null, lead: 2, cover: "REP" },
    ], about: "Commercial HVAC service and maintenance across Central Florida." },
  { nn: 57, first: "Kim", last: "Nguyen", title: "Commercial Grounds Manager", city: "Tampa", state: "FL", area: "813", company: "GreenEdge Landscaping", bts: ["LANDSCAPING_GROUNDS"], roles: [], skills: [], modes: [],
    rates: [{ group: "Facilities", type: "Per Visit", cents: 9500 }, { group: "Facilities", type: "Monthly Service Contract", cents: 65000 }],
    products: [
      { bt: "LANDSCAPING_GROUNDS", type: "Monthly Grounds Contract", title: "Monthly Grounds Contract", summary: "Weekly mowing, edging, beds and litter pick-up.", cents: 65000, monthly: true, lead: 7, cover: "GR" },
      { bt: "LANDSCAPING_GROUNDS", type: "Spring / Fall Cleanup", title: "Spring / Fall Cleanup", summary: "Leaves, beds, pruning and mulch refresh, one visit.", cents: 49500, lead: 7, cover: "CL" },
      { bt: "LANDSCAPING_GROUNDS", type: "Irrigation Check", title: "Irrigation Check", summary: "Zone-by-zone test, head adjustments and a repair list.", cents: 12000, lead: 3, cover: "IRR" },
    ], about: "Commercial grounds care for office parks and HOAs in Tampa Bay." },
  { nn: 58, first: "Ray", last: "Dobbs", title: "Owner-Operator, Long Haul", city: "Savannah", state: "GA", area: "912", company: "Dobbs Freight LLC", bts: ["FREIGHT_TRUCKING"], roles: [], skills: [], modes: [],
    rates: [{ group: "Transportation", type: "Per Load / Shipment", cents: 180000 }, { group: "Transportation", type: "Detention (Hourly)", cents: 7500 }],
    products: [
      { bt: "FREIGHT_TRUCKING", type: "Dedicated Lane (Monthly)", title: "Dedicated Lane (Monthly)", summary: "One truck on your lane, five days a week.", cents: 1450000, monthly: true, lead: 14, cover: "DL" },
      { bt: "FREIGHT_TRUCKING", type: "Expedited / Team Load", title: "Expedited / Team Load", summary: "Team drivers, coast to coast in under three days.", cents: 320000, lead: 2, cover: "EXP" },
    ], about: "Dry van long haul out of the Port of Savannah." },
];

// SH2-E005: one seller per new Day-1 Category (test61–68), as in the Shop & Hire mockup.
const prod = (bt: string, type: string, title: string, summary: string, dollars: number, lead: number, cover: string, extra: Partial<Product> = {}): Product => ({ bt, type, title, summary, cents: dollars * 100, lead, cover, ...extra });
MARKETPLACE_SELLERS.push(
  { nn: 61, first: "Maya", last: "Chen", title: "Owner, Brightpath Local", city: "Orlando", state: "FL", area: "407", company: "Brightpath Local", bts: ["DIGITAL_MARKETING"], roles: [], skills: [], modes: [],
    rates: [{ group: "Marketing", type: "Hourly", cents: 7500 }],
    products: [prod("DIGITAL_MARKETING", "Local SEO Setup", "Local SEO setup (Google Business Profile)", "Profile built and verified, categories, photos, and the first 10 reviews asked for.", 499, 7, "SEO", { offers: true }), prod("DIGITAL_MARKETING", "Google Ads Management", "Google Ads management", "Search ads for local service businesses, managed and reported monthly.", 750, 5, "ADS", { monthly: true, offers: true })],
    about: "Local marketing agency for home-service businesses." },
  { nn: 62, first: "Owen", last: "Price", title: "Founder, Pixel & Pine Studio", city: "Asheville", state: "NC", area: "828", company: "Pixel & Pine Studio", bts: ["WEB_DESIGN_DEVELOPMENT"], roles: [], skills: [], modes: [],
    rates: [{ group: "Websites", type: "Hourly", cents: 8500 }],
    products: [prod("WEB_DESIGN_DEVELOPMENT", "Website Design", "5-page small business website", "Home, about, services, reviews and contact — mobile-ready, launched in three weeks.", 2400, 21, "WEB", { offers: true }), prod("WEB_DESIGN_DEVELOPMENT", "Website Care Plan", "Website care plan", "Updates, backups, security and an hour of changes every month.", 150, 3, "CARE", { monthly: true })],
    about: "Small studio building websites for local businesses." },
  { nn: 63, first: "Leo", last: "Martin", title: "Founder, Callwise AI", city: "Austin", state: "TX", area: "512", company: "Callwise AI", bts: ["DATA_AI"], roles: [], skills: [], modes: [],
    rates: [{ group: "AI & Automation", type: "Hourly", cents: 9500 }],
    products: [prod("DATA_AI", "AI Receptionist", "AI receptionist (answers calls 24/7)", "Answers, books and texts back — every call, day and night.", 199, 5, "AIR", { monthly: true, agent: true }), prod("DATA_AI", "Chatbot", "Website chatbot, trained on your site", "A chatbot that answers from your pages and hands leads to you.", 900, 10, "BOT", { offers: true })],
    about: "AI receptionists and chatbots for small businesses." },
  { nn: 64, first: "Grace", last: "Kim", title: "Owner, Ledgerly Books", city: "Charlotte", state: "NC", area: "704", company: "Ledgerly Books", bts: ["ACCOUNTING", "VIRTUAL_ASSISTANTS"], roles: [], skills: [], modes: [],
    rates: [{ group: "Finance & Admin", type: "Hourly", cents: 4500 }],
    products: [prod("ACCOUNTING", "Bookkeeping", "Monthly bookkeeping (QuickBooks)", "Books reconciled and closed every month, with a one-page report.", 350, 7, "BK", { monthly: true, offers: true }), prod("VIRTUAL_ASSISTANTS", "Virtual Assistant (10 Hours)", "Virtual assistant, 10 hours", "Inbox, calendar, invoices and data entry — use the hours as you need.", 250, 2, "VA")],
    about: "Bookkeeping and virtual assistants for small businesses." },
  { nn: 65, first: "Marcus", last: "Hill", title: "Owner, Bastion IT", city: "Tampa", state: "FL", area: "813", company: "Bastion IT", bts: ["IT_SERVICES_SUPPORT", "CYBERSECURITY"], roles: [], skills: [], modes: [],
    rates: [{ group: "IT", type: "Hourly Technician", cents: 11000 }],
    products: [prod("IT_SERVICES_SUPPORT", "Managed IT (per user)", "Managed IT, up to 10 users", "Help desk, patching, backups and monitoring for up to 10 people.", 600, 7, "MIT", { monthly: true, offers: true }), prod("CYBERSECURITY", "Cybersecurity Check-Up", "Small business security check-up", "Passwords, devices, email and backups reviewed, with a fix list.", 1200, 10, "SEC")],
    about: "Managed IT and security for offices of 5 to 50." },
  { nn: 66, first: "Zoe", last: "Turner", title: "Producer, Reelhouse Media", city: "Atlanta", state: "GA", area: "404", company: "Reelhouse Media", bts: ["VIDEO_PHOTOGRAPHY", "CONTENT_COPYWRITING"], roles: [], skills: [], modes: [],
    rates: [{ group: "Marketing", type: "Hourly", cents: 6500 }],
    products: [prod("VIDEO_PHOTOGRAPHY", "Short-Form Clips", "10 short-form clips a month", "Ten edited clips for Reels, TikTok and Shorts from your footage.", 400, 7, "CLIP", { monthly: true, offers: true }), prod("CONTENT_COPYWRITING", "Copywriting", "4 blog posts, 1,000 words each", "Four researched posts written for your customers and search.", 480, 14, "BLOG")],
    about: "Video editing, short clips and copy for small brands." },
  { nn: 67, first: "Daniel", last: "Ford", title: "Managing Partner, Fractional Bench", city: "Nashville", state: "TN", area: "615", company: "Fractional Bench", bts: ["MANAGEMENT_CONSULTING", "COACHING_MENTORING"], roles: [], skills: [], modes: [],
    rates: [{ group: "Mentoring & Advisory", type: "Offsite Hourly", cents: 20000 }],
    products: [prod("MANAGEMENT_CONSULTING", "Strategy Session", "90-minute strategy session", "One focused session on your biggest question, with written next steps.", 350, 3, "STR"), prod("MANAGEMENT_CONSULTING", "Fractional CFO", "Fractional CFO, 2 days a month", "Cash flow, pricing and board-ready numbers from a part-time CFO.", 3500, 14, "CFO", { monthly: true, offers: true })],
    about: "Fractional executives and mentors for growing companies." },
  { nn: 68, first: "Tony", last: "Russo", title: "Owner, Hotline Leads", city: "Jacksonville", state: "FL", area: "904", company: "Hotline Leads", bts: ["LEAD_GENERATION"], roles: [], skills: [], modes: [],
    rates: [{ group: "Lead Generation", type: "Per Lead", cents: 6500 }],
    products: [prod("LEAD_GENERATION", "Trade Lead Package", "20 exclusive HVAC leads", "Twenty phone-verified HVAC leads in your service area, sold only to you.", 900, 7, "HVL", { offers: true }), prod("LEAD_GENERATION", "Pay-Per-Lead", "Roofing leads, pay per lead", "Exclusive roofing leads, billed per lead delivered.", 65, 3, "ROOF")],
    about: "Exclusive leads for HVAC, roofing and plumbing companies." },
);

export const MARKETPLACE_BUYERS: Buyer[] = [
  { nn: 59, first: "Anna", last: "Lopez", title: "Procurement Manager", city: "Houston", state: "TX", area: "713", company: "Lopez Manufacturing" },
  { nn: 60, first: "Victor", last: "Hale", title: "Director of Supply Chain", city: "Nashville", state: "TN", area: "615", company: "Hale Health Systems" },
];

const email = (nn: number) => `test${nn}@panameer.com`;
const lastName = (last: string, nn: number) => `${last} (${nn})`;
const PHOTO_DIR = path.resolve(process.cwd(), "../../1. Project Documents/2. Design/11. User Profile Pics");

async function photoBytes(s: { first: string; last: string; photo?: string }): Promise<ArrayBuffer> {
  const sharp = (await import("sharp")).default;
  const file = s.photo ? path.join(PHOTO_DIR, s.photo) : null;
  const buf = file && existsSync(file)
    ? await sharp(readFileSync(file)).resize(600, 600, { fit: "cover" }).png().toBuffer()
    : await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#272334"/><rect y="560" width="600" height="40" fill="#D72CD6"/><text x="300" y="300" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="220" font-weight="700" fill="#FFFFFF">${s.first[0]}${s.last[0]}</text></svg>`)).png().toBuffer();
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Resolves every catalog name the set uses; any miss is reported (dry run) or refuses (apply). */
async function lookups() {
  const misses: string[] = [];
  const btCodes = [...new Set(MARKETPLACE_SELLERS.flatMap((s) => s.bts))];
  const bts = new Map((await prisma.businessType.findMany({ where: { code: { in: btCodes } }, select: { id: true, code: true } })).map((b) => [b.code, b.id]));
  btCodes.filter((c) => !bts.has(c)).forEach((c) => misses.push(`business type ${c}`));
  const roles = new Map((await prisma.role.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));
  const workRoles = new Map((await prisma.workRole.findMany({ select: { id: true, mode: true, name: true } })).map((w) => [`${w.mode}|${w.name}`, w.id]));
  const skillRows = await prisma.skill.findMany({ where: { business_type_id: bts.get(CS), status: "ACTIVE", is_custom: false }, select: { id: true, name: true, role: { select: { code: true } }, pillar: { select: { name: true } } } });
  const skill = (name: string, roleCodes: string[]) => {
    const named = skillRows.filter((k) => k.name === name);
    const hits = named.some((k) => roleCodes.includes(k.role.code)) ? named.filter((k) => roleCodes.includes(k.role.code)) : named;
    return (hits.find((k) => k.pillar?.name === "Oracle Fusion Cloud") ?? hits[0])?.id;
  };
  const rateType = new Map<string, { id: string; unit: ServiceUnit }>();
  const productType = new Map<string, { id: string; unit: ServiceUnit }>();
  for (const s of MARKETPLACE_SELLERS) {
    for (const r of s.rates) {
      const k = `${r.group}|${r.type}`;
      if (rateType.has(k)) continue;
      const t = await prisma.serviceType.findFirst({ where: { name: r.type, kind: "SERVICE", status: "STOCK", serviceCategory: { commodityGroup: { name: r.group } } }, select: { id: true, units: true } });
      if (t) rateType.set(k, { id: t.id, unit: t.units[0] ?? "HOUR" }); else misses.push(`rate type ${k}`);
    }
    for (const x of s.products) {
      const k = `${x.bt}|${x.type}`;
      if (productType.has(k)) continue;
      const t = await prisma.serviceType.findFirst({ where: { name: x.type, kind: "SERVICE_PRODUCT", status: "STOCK", serviceCategory: { businessType: { code: x.bt } } }, select: { id: true, units: true } });
      if (t) productType.set(k, { id: t.id, unit: t.units[0] ?? "EACH" }); else misses.push(`product type ${k}`);
    }
    for (const r of s.roles) if (!roles.has(r)) misses.push(`role ${r}`);
    for (const [m, w] of s.modes) if (!workRoles.has(`${m}|${w}`)) misses.push(`work role ${m}|${w}`);
    for (const k of s.skills) if (!skill(k, s.roles)) misses.push(`skill ${k} (${s.first})`);
  }
  const spt = new Map((await prisma.serviceProductType.findMany({ select: { id: true, name: true } })).map((t) => [t.name, t.id]));
  return { misses, bts, roles, workRoles, skill, rateType, productType, spt };
}

export type MarketplaceRow = { nn: number; email: string; name: string; kind: "seller" | "buyer"; result: "created" | "skipped (exists)" | "would create" };
export type MarketplaceResult = { rows: MarketplaceRow[]; misses: string[]; applied: boolean };

export async function createMarketplaceTestSet(opts: { apply: boolean; actor?: Viewer | null; password?: string }): Promise<MarketplaceResult> {
  const L = await lookups();
  const everyone = [...MARKETPLACE_SELLERS.map((s) => ({ ...s, kind: "seller" as const })), ...MARKETPLACE_BUYERS.map((b) => ({ ...b, kind: "buyer" as const }))];
  const existing = new Set((await prisma.user.findMany({ where: { email: { in: everyone.map((e) => email(e.nn)) } }, select: { email: true } })).map((u) => u.email.toLowerCase()));
  const rows: MarketplaceRow[] = everyone.map((e) => ({ nn: e.nn, email: email(e.nn), name: `${e.first} ${lastName(e.last, e.nn)}`, kind: e.kind, result: existing.has(email(e.nn)) ? "skipped (exists)" : opts.apply ? "created" : "would create" }));
  if (!opts.apply) return { rows, misses: L.misses, applied: false };
  if (L.misses.length) throw new TestAccountError(`The catalog is missing: ${L.misses.join(", ")}`, "INVALID");
  const password = opts.password ?? process.env.TEST_ACCOUNT_PASSWORD;
  if (!password || (!opts.password && password.length < 10)) throw new TestAccountError("Set TEST_ACCOUNT_PASSWORD (10+ characters) in the environment before creating test accounts.", "CONFIG");
  const hash = await (await import("bcryptjs")).hash(password, 10);
  const now = new Date();

  for (const e of everyone) {
    if (existing.has(email(e.nn))) {
      // SH2-E005: an existing test seller's company follows a renamed definition (Coastal Print Co → Harbor Print Co.).
      const co = await prisma.company.findFirst({ where: { people: { some: { user: { email: email(e.nn), is_test: true } } } }, select: { id: true, name: true, p_account_id: true } });
      if (co && co.name !== e.company) {
        await prisma.company.update({ where: { id: co.id }, data: { name: e.company, legal_name: e.company } });
        await prisma.pAccount.update({ where: { id: co.p_account_id }, data: { name: e.company } });
      }
      continue;
    }
    const isSeller = e.kind === "seller";
    const acct = await prisma.pAccount.create({ data: { kind: isSeller ? "PROVIDER" : "BUYER", name: e.company }, select: { id: true } });
    const co = await prisma.company.create({
      data: { p_account_id: acct.id, name: e.company, legal_name: e.company, invoice_email: email(e.nn), country: "United States", country_code: "US", company_tos_accepted_at: now, company_tos_version: "test-set" },
      select: { id: true },
    });
    const site = await prisma.site.create({ data: { company_id: co.id, name: "Primary" }, select: { id: true } });
    await prisma.address.create({
      data: { site_id: site.id, line1: `${100 + e.nn} Market Street`, city: e.city, state: e.state, postal_code: "00000", country: "United States", country_code: "US", is_corporate: true, is_remit_to: isSeller, is_bill_to: !isSeller, is_ship_to: !isSeller },
    });
    const user = await prisma.user.create({
      data: { email: email(e.nn), password_hash: hash, first_name: e.first, last_name: lastName(e.last, e.nn), email_verified: now, is_test: true, is_active: true, tos_accepted_at: now, tos_version: "test-set" },
      select: { id: true },
    });
    const person = await prisma.person.create({
      data: { user_id: user.id, company_id: co.id, site_id: site.id, first_name: e.first, last_name: lastName(e.last, e.nn), title: e.title, phone: `+1${e.area}55501${String(e.nn).padStart(2, "0")}`, is_service_provider: isSeller, is_service_buyer: !isSeller },
      select: { id: true },
    });
    await prisma.companyMembership.create({ data: { person_id: person.id, company_id: co.id, role: "ADMIN", status: "APPROVED", decided_at: now, auto_approved: true } });
    await prisma.company.update({ where: { id: co.id }, data: { company_tos_accepted_by: person.id } });
    const photoUrl = await uploadProfilePhoto(person.id, await photoBytes(e).then((bytes) => ({ type: "image/png", size: bytes.byteLength, bytes })));
    await prisma.person.update({ where: { id: person.id }, data: { photo_url: photoUrl } });

    if (!isSeller) {
      await prisma.buyerProfile.create({ data: { person_id: person.id } });
      continue;
    }
    const s = e as Seller & { kind: "seller" };
    for (const code of s.bts) await prisma.companyBusinessType.create({ data: { company_id: co.id, business_type_id: L.bts.get(code)! } });
    const pp = await prisma.providerProfile.create({
      data: { person_id: person.id, overview: s.about, role_id: s.roles[0] ? L.roles.get(s.roles[0]) : null, profile_method: "MANUAL", status: "ACTIVE", registration_step: "review", registration_completed_at: now },
      select: { id: true },
    });
    for (const r of s.roles) await prisma.providerProfileRole.create({ data: { provider_profile_id: pp.id, role_id: L.roles.get(r)! } });
    for (const k of s.skills) await prisma.providerSkill.create({ data: { provider_profile_id: pp.id, skill_id: L.skill(k, s.roles)!, weight: 0.75, source: "SELF_ADDED" } });
    for (const [mode, w] of s.modes) await prisma.providerCapability.create({ data: { provider_profile_id: pp.id, mode, work_role_id: L.workRoles.get(`${mode}|${w}`)!, source: "SELF", confirmed_at: now } });

    const viewer: Viewer = { userId: user.id, role: "user", isSystemAdmin: false, isAdmin: false, isServiceBuyer: false, isServiceProvider: true, isServiceCoordinator: false, isSupport: false, pAccountId: acct.id };
    for (const r of s.rates) {
      const t = L.rateType.get(`${r.group}|${r.type}`)!;
      await saveCatalogService(viewer, { serviceTypeId: t.id, on: true, rateCents: r.cents, unit: t.unit, hoursIncluded: r.hours ?? null });
    }
    await publishCatalog(viewer);
    for (const [i, x] of s.products.entries()) {
      const recurring = !!x.monthly;
      await prisma.serviceProduct.create({
        data: {
          provider_profile_id: pp.id, company_id: co.id, title: x.title, summary: x.summary.slice(0, 120), price_cents: x.cents,
          kind: x.agent ? "DEPLOYABLE" : recurring ? "HOURS" : "DELIVERABLE", pricing_type: recurring ? "RECURRING" : "FIXED", billing_period: recurring ? "MONTHLY" : null,
          payment_terms: "NET30", payment_event: x.agent ? "ORDER_ACCEPTED" : recurring ? "INVOICE" : "ACCEPTANCE",
          status: "PUBLISHED", offered: true, open_to_offers: !!x.offers, delivery: "EITHER", lead_time_days: x.lead, cover_code: x.cover, cover_style: "D", sort_order: 100 + i,
          service_type_id: L.productType.get(`${x.bt}|${x.type}`)!.id, product_type_id: L.spt.get(x.type) ?? null,
        },
      });
    }
    await prisma.providerProfile.update({ where: { id: pp.id }, data: { onboarding_completed_at: new Date() } });
  }

  if (opts.actor) {
    await writeAudit(opts.actor, { action: "test_set.create", targetTable: "users", detail: { set: "marketplace test38-test60", created: rows.filter((r) => r.result === "created").map((r) => r.email) }, rowCount: rows.filter((r) => r.result === "created").length });
  }
  return { rows, misses: [], applied: true };
}
