import { formatSkillName } from "./skill-match";

// Row 3 gate: real catalog names, acronyms kept, case-only changes.
let fail = 0;
const ok = (raw: string, want: string) => {
  const got = formatSkillName(raw);
  const caseOnly = got.toLowerCase() === raw.toLowerCase();
  if (got !== want || !caseOnly) {
    fail++;
    console.log(`✗ "${raw}" → "${got}" (want "${want}")${caseOnly ? "" : " LETTERS CHANGED"}`);
  }
};
ok("purchase requisitons", "Purchase Requisitons");
ok("Self-Service Procurement", "Self-Service Procurement");
ok("FNDLOAD", "FNDLOAD");
ok("CEMLI / RICEW", "CEMLI / RICEW");
ok("LDAP / SSO / PS_TOKEN", "LDAP / SSO / PS_TOKEN");
ok("AI Infrastructure & MLOps", "AI Infrastructure & MLOps");
ok("OAuth 2.0 / Certificate & CSF Key Mgmt", "OAuth 2.0 / Certificate & CSF Key Mgmt");
ok("SQL*Loader", "SQL*Loader");
ok("Management Reporting & FP&A", "Management Reporting & FP&A");
ok("Apex Test Classes", "Apex Test Classes");
ok("PeopleSoft Workflow (classic)", "PeopleSoft Workflow (Classic)");
ok("procure-to-pay", "Procure-to-Pay");
ok("PROCURE TO PAY", "Procure to Pay");
ok("otbi dashboards", "OTBI Dashboards");
ok("oracle fusion cloud", "Oracle Fusion Cloud");
ok("ebs r12 upgrade", "EBS R12 Upgrade");
ok("fbdi data loads", "FBDI Data Loads");
ok("hdl and hsdl loaders", "HDL and HSDL Loaders");
ok("bip reports", "BIP Reports");
ok("oic integrations", "OIC Integrations");
ok("vbcs extensions", "VBCS Extensions");
ok("oracle apex", "Oracle APEX");
ok("pl/sql development", "PL/SQL Development");
ok("rest and soap apis", "REST and SOAP Apis");
ok("ai agents", "AI Agents");
ok("uat and sit testing", "UAT and SIT Testing");
ok("crp sessions", "CRP Sessions");
ok("ap invoices", "AP Invoices");
ok("gl period close", "GL Period Close");
ok("iprocurement", "iProcurement");
ok("isupplier portal", "iSupplier Portal");
ok("peoplesoft hcm", "PeopleSoft HCM");
ok("sap s/4hana migration", "SAP S/4HANA Migration");
ok("supplier/vendor management", "Supplier/Vendor Management");
ok("the general ledger", "The General Ledger");
ok("redwood navigation", "Redwood Navigation");
ok("Order-to-Cash (O2C)", "Order-to-Cash (O2C)");
ok("workday financials", "Workday Financials");
ok("dff and eff setup", "DFF and EFF Setup");
console.log(fail ? `${fail} failed` : "formatSkillName — 39 names pass, case-only");
process.exit(fail ? 1 : 0);
