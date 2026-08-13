#!/usr/bin/env python3
"""
Build the v5 seed JSON from `Service Catalog v5.xlsx`.

    python3 scripts/build-service-catalog-v5.py

Writes three files under prisma/seed-data/:

    service-catalog.json      roles -> domains -> skills   (the seeder's input)
    capability-domains.json   the 9 processes -> capability domains
    capability-bridge.json    capability domain -> the module that delivers it,
                              per suite

WHY A GENERATOR AND NOT A ONE-OFF PASTE
---------------------------------------
The catalog has been re-cut three times (V1, expanded, v5) and will be again.
Each previous pass left a JSON with no way back to the spreadsheet it came from,
so the next pass started by reverse-engineering the last one. This script is the
edge between the two: the xlsx stays the thing Scott edits, the JSON stays the
thing the seeder reads, and regenerating is one command instead of an
archaeology exercise.

WHAT IT DOES BEYOND COPYING
---------------------------
1. THE 24-NAME CLEANUP. Twenty-four analytics/developer names appear on BOTH
   vendor sheets — "BI Publisher" as an Oracle Fusion application AND as an
   Oracle Fusion tech tool. Role is DERIVED from a job's skills in the new
   model, so a name owned by two roles makes that derivation a coin flip. They
   are dropped from the App sheet and kept under Technology-Specific, which is
   where a reporting tool belongs.

2. EXACT-DUPLICATE MERGE. The Tech sheet lists `Change Impact Analyzer`
   (PeopleSoft) and `Business Process Security Policies` (Workday) twice each,
   differing only in how much of the alias note is filled in. Same suite, same
   name, same thing; the aliases are unioned and the row appears once.

3. AI-SPECIALIST IS CARRIED THROUGH UNTOUCHED. The v5 workbook still contains
   the old "Artificial Intelligence" sheet that seeded it, but this brief's
   source-of-truth list does not include that sheet and says nothing about the
   role. Regenerating it from the legacy sheet would be a silent, unrequested
   re-cut, and OMITTING it would be worse — the seeder's retirement pass deletes
   any role the JSON stops mentioning. It is copied verbatim from the existing
   JSON instead.

WHAT IT DELIBERATELY DOES NOT DO
--------------------------------
Six names collide between App-Specific modules and Ops/Project capability
domains — "Project Costing" is both an Oracle module and a generic capability.
They are NOT deduplicated: they are genuinely different things, the brief says
Ops/Project are unchanged, and the Bridge exists precisely to relate the two.
The parser's controlled vocabulary is vendor-only (aliases live on vendor rows
alone), so role derivation never sees the Ops reading and stays deterministic.
"""

import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required:  pip3 install openpyxl")

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
XLSX = os.path.normpath(
    os.path.join(
        REPO, "..", "4. Project Documents", "2. Design", "04. Service Catalog",
        "Service Catalog v5.xlsx",
    )
)
SEED_DIR = os.path.join(REPO, "prisma", "seed-data")

APP_SHEET = "App-Specific (Vendors)"
TECH_SHEET = "Technology-Specific (Vendors)"
OPS_SHEET = "Catalog — Ops·Project"
CAP_SHEET = "Capability Domains"
BRIDGE_SHEET = "Capability ↔ Module Bridge"

HEADER_ROW = 4  # rows 1-3 are the title and the read-me preamble

# The 24 from the brief, as they are actually spelled on the sheets.
DUAL_ROLE_NAMES = {
    "Advanced Access Controls", "Apex", "Application Designer", "Application Engine",
    "Applications Object Library", "Aura Components", "BI Publisher", "CRM Analytics",
    "Component Interfaces", "Daily Business Intelligence", "Data Cloud", "DevOps Center",
    "Fluid UI", "Fusion Data Intelligence", "Integration Broker", "Lightning Web Components",
    "OmniStudio", "Oracle Analytics Cloud", "People Analytics", "PeopleCode",
    "Prism Analytics", "Tableau", "Visualforce", "nVision",
}


def read(wb, sheet):
    """Rows of a v5 sheet as dicts, skipping the preamble and blank lines."""
    rows = list(wb[sheet].iter_rows(min_row=HEADER_ROW, values_only=True))
    hdr = [str(h).strip() if h is not None else "" for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not any(c is not None and str(c).strip() for c in r):
            continue
        out.append({
            hdr[i]: (str(r[i]).strip() if i < len(r) and r[i] is not None else "")
            for i in range(len(hdr))
        })
    return out


def aliases(raw):
    """
    Split an alias cell into parser tokens.

    Semicolon-separated in the sheet, but the column doubles as a notes field
    ("CIA; regression scoping"), so anything sentence-shaped is dropped rather
    than fed to the matcher as a phrase nobody will ever type.
    """
    if not raw:
        return []
    parts = [p.strip() for p in re.split(r"[;,]", raw) if p.strip()]
    return [p for p in parts if len(p) <= 40 and len(p.split()) <= 5]


def main():
    if not os.path.exists(XLSX):
        sys.exit(f"Cannot find the workbook at {XLSX}")
    wb = openpyxl.load_workbook(XLSX, data_only=True)

    stats = defaultdict(int)

    # ---- Application-Specific: Suite -> module ------------------------------
    app_rows = [r for r in read(wb, APP_SHEET) if r["Application / Module (Skill)"]]
    stats["app_raw"] = len(app_rows)
    app = OrderedDict()
    for r in app_rows:
        name = r["Application / Module (Skill)"]
        if name in DUAL_ROLE_NAMES:
            stats["app_dropped_dual_role"] += 1
            continue
        app.setdefault(r["Software Suite (Domain)"], OrderedDict())
        app[r["Software Suite (Domain)"]][name] = {
            "name": name,
            "aliases": aliases(r.get("Résumé Aliases / Legacy Names", "")),
        }

    # ---- Technology-Specific: Suite -> tool (+ category) --------------------
    # Category is written once per group and left blank on the rows beneath it,
    # the way a person formats a spreadsheet. Read literally, 224 of 264 tools
    # come out uncategorised; carried down, they are all categorised. The reset
    # on a suite change matters — the last category of Oracle's block must not
    # leak onto the first tool of PeopleSoft's.
    tech_rows_raw = read(wb, TECH_SHEET)
    carried_cat, carried_suite = "", ""
    for r in tech_rows_raw:
        if r["Software Suite (Domain)"] != carried_suite:
            carried_suite, carried_cat = r["Software Suite (Domain)"], ""
        if r.get("Tech Category"):
            carried_cat = r["Tech Category"]
        elif r["Tool / Technology (Skill)"]:
            r["Tech Category"] = carried_cat

    tech_rows = [r for r in tech_rows_raw if r["Tool / Technology (Skill)"]]
    stats["tech_raw"] = len(tech_rows)
    tech = OrderedDict()
    for r in tech_rows:
        suite, name = r["Software Suite (Domain)"], r["Tool / Technology (Skill)"]
        tech.setdefault(suite, OrderedDict())
        entry = tech[suite].get(name)
        al = aliases(r.get("Aliases / Legacy / Notes", ""))
        cat = r.get("Tech Category", "") or None
        # The group header row ("aka: Oracle Cloud Applications tech stack…") is
        # a note, not a category — it only ever appears where the skill cell is
        # empty, so it is already excluded, but a stray one must not be carried.
        if cat and cat.lower().startswith("aka:"):
            cat = None
        if entry:
            # Exact duplicate — union the aliases, keep the first category.
            stats["tech_merged_duplicates"] += 1
            entry["aliases"] = sorted(set(entry["aliases"]) | set(al))
            entry["category"] = entry.get("category") or cat
        else:
            tech[suite][name] = {"name": name, "aliases": al, "category": cat}

    # ---- Operations / Project: process -> capability ------------------------
    ops_rows = [r for r in read(wb, OPS_SHEET) if r["Skill (Capability Domain / Role)"]]
    ops = OrderedDict()
    for r in ops_rows:
        role, dom = r["Role"], r["Domain (Process / Pillar)"]
        ops.setdefault(role, OrderedDict()).setdefault(dom, OrderedDict())
        # (name, domain) is the key — "Account Reconciliation" is legitimately
        # both a Record-to-Report and an EPM capability.
        ops[role][dom][r["Skill (Capability Domain / Role)"]] = {
            "name": r["Skill (Capability Domain / Role)"]
        }

    # ---- Carry AI-Specialist through verbatim -------------------------------
    with open(os.path.join(SEED_DIR, "service-catalog.json")) as f:
        previous = json.load(f)
    ai_role = next((r for r in previous["roles"] if r["name"] == "AI-Specialist"), None)

    def role_block(name, display, grouped):
        return {
            "name": name,
            "display": display,
            "domains": [
                {"name": dom, "skills": list(skills.values())}
                for dom, skills in grouped.items()
            ],
        }

    roles = [
        role_block("Application-Specific", "Application-Specific Roles", app),
        role_block("Technology-Specific", "Technology-Specific Roles", tech),
    ]
    for role_name in ("Operations-Specific", "Project-Specific"):
        if role_name in ops:
            roles.append(role_block(role_name, f"{role_name} Roles", ops[role_name]))
    if ai_role:
        roles.append(ai_role)

    catalog = {
        "_source": (
            "4. Project Documents/2. Design/04. Service Catalog/Service Catalog v5.xlsx — "
            "sheets: App-Specific (Vendors), Technology-Specific (Vendors), Catalog — Ops·Project. "
            "Generated by scripts/build-service-catalog-v5.py; do not hand-edit."
        ),
        "_note": (
            "v5: Application-Specific and Technology-Specific are VENDOR catalogs — the domain is "
            "the Software Suite and the skill is the module/tool, so the same module on two suites "
            "is two rows (Oracle GL != EBS GL) and attribution is unambiguous. Operations-Specific "
            "and Project-Specific stay software-agnostic (process -> capability). Skills are objects "
            "carrying `aliases` (parser vocabulary) and, for tech tools, `category`. AI-Specialist is "
            "carried over from the previous catalog untouched — it is out of this brief's scope and "
            "omitting it would make the seeder retire it."
        ),
        "roles": roles,
        "specializations": previous["specializations"],
    }

    # ---- Capability domains + bridge ---------------------------------------
    cap_rows = read(wb, CAP_SHEET)
    caps, process = [], ""
    for r in cap_rows:
        # The process column is filled only on the first row of each group.
        process = r["Business Process / Pillar (Domain)"] or process
        if r["Capability Domain (Skill)"]:
            caps.append({"process": process, "name": r["Capability Domain (Skill)"]})

    # ---- Resolve each bridge cell to real catalog modules -------------------
    #
    # The bridge sheet is written in the buyer's shorthand, not in catalog
    # names: "iProcurement (POR)" for iProcurement, "Payables (AP)" for
    # Payables, and sometimes two modules in one cell ("Payments (IBY)/Cash
    # (CE)"). Left as raw strings, 83 of 130 rows matched nothing.
    #
    # RESOLUTION TRIES THE WHOLE CELL FIRST and only then decomposes, because
    # decomposing first would destroy real names: 48 catalog entries contain a
    # slash ("Accounting / General Ledger", "SSO / SAML / Federation") and 12
    # contain parentheses ("Import Management (CX)"). Splitting those would turn
    # one correct module into two names that exist nowhere.
    lookup = {}  # (suite, lowered name-or-alias) -> catalog name
    for suite, skills in list(app.items()) + list(tech.items()):
        for s in skills.values():
            lookup.setdefault((suite, s["name"].lower()), s["name"])
            for a in s["aliases"]:
                lookup.setdefault((suite, a.lower()), s["name"])

    # The sheet abbreviates where the catalog spells out. Applied ONLY as a
    # fallback after an exact match has failed, so it can widen a miss but never
    # redirect a hit.
    EXPANSIONS = [
        (r"\bMgmt\b", "Management"), (r"\bMgr\b", "Manager"),
        (r"\bComp\b", "Compensation"), (r"\bAdv\b", "Advanced"),
        (r"\s*&\s*", " and "),
    ]

    def expand(t):
        out = t
        for pat, rep in EXPANSIONS:
            out = re.sub(pat, rep, out)
        return re.sub(r"\s+", " ", out).strip()

    def resolve(suite, cell):
        """Catalog module names this cell refers to, best effort, in order."""
        def one(text):
            t = text.strip()
            if not t:
                return None
            for candidate in (t, expand(t)):
                hit = lookup.get((suite, candidate.lower()))
                if hit:
                    return hit
            # "iProcurement (POR)" -> "iProcurement"
            stripped = re.sub(r"\s*\([^)]*\)\s*$", "", t).strip()
            if stripped and stripped != t:
                for candidate in (stripped, expand(stripped)):
                    hit = lookup.get((suite, candidate.lower()))
                    if hit:
                        return hit
                t = stripped
            # Last resort: a UNIQUE longer catalog name that begins with this
            # ("iSupplier" -> "iSupplier Portal"). Ambiguity is refused rather
            # than resolved arbitrarily — a wrong bridge row silently mismatches
            # buyers to providers, which is worse than a missing one.
            prefix = f"{expand(t).lower()} "
            hits = {v for (s, k), v in lookup.items() if s == suite and k.startswith(prefix)}
            return hits.pop() if len(hits) == 1 else None

        whole = one(cell)
        if whole:
            return [whole]
        parts = [p for p in (one(x) for x in cell.split("/")) if p]
        return list(dict.fromkeys(parts))  # de-duped, order kept

    bridge_rows = read(wb, BRIDGE_SHEET)
    suite_cols = [c for c in bridge_rows[0].keys() if c not in ("Process", "Capability Domain", "")]
    bridge = []
    for r in bridge_rows:
        if not r.get("Capability Domain"):
            continue
        for suite in suite_cols:
            cell = r.get(suite, "")
            # An em dash means "this suite has no module for this capability".
            if not cell or cell == "—":
                continue
            hits = resolve(suite, cell)
            stats["bridge_cells"] += 1
            if not hits:
                stats["bridge_unresolved"] += 1
            for module in hits or [cell]:
                bridge.append({
                    "process": r["Process"],
                    "capability": r["Capability Domain"],
                    "suite": suite,
                    "module": module,
                    # What the sheet said, kept so an unresolved row is
                    # diagnosable instead of just missing.
                    "raw": cell,
                    "resolved": bool(hits),
                })

    def write(name, payload):
        p = os.path.join(SEED_DIR, name)
        with open(p, "w") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"  wrote {name}")

    write("service-catalog.json", catalog)
    write("capability-domains.json", {
        "_source": f"{os.path.basename(XLSX)} — sheet 'Capability Domains'",
        "domains": caps,
    })
    write("capability-bridge.json", {
        "_source": f"{os.path.basename(XLSX)} — sheet 'Capability ↔ Module Bridge'",
        "_note": "capability domain -> the module that delivers it, per suite. Powers "
                 "capability-only Work Requests (WS-5) and the buyer assessment later.",
        "bridge": bridge,
    })

    print("\nCOUNTS")
    for r in roles:
        n = sum(len(d["skills"]) for d in r["domains"])
        print(f"  {r['name']:22} {len(r['domains']):3} domains  {n:4} skills")
    print(f"  capability domains     {len(caps)}")
    print(f"  bridge rows            {len(bridge)}  from {stats['bridge_cells']} sheet cells "
          f"({stats['bridge_unresolved']} unresolved)")
    if stats["bridge_unresolved"]:
        for b in bridge:
            if not b["resolved"]:
                print(f"     unresolved: {b['suite']} / {b['raw']}")
    print("\nCLEANUP")
    print(f"  App rows on the sheet          {stats['app_raw']}")
    print(f"  dropped as dual-role           {stats['app_dropped_dual_role']}  -> App = "
          f"{stats['app_raw'] - stats['app_dropped_dual_role']}")
    print(f"  Tech rows on the sheet         {stats['tech_raw']}")
    print(f"  merged exact duplicates        {stats['tech_merged_duplicates']}  -> Tech = "
          f"{stats['tech_raw'] - stats['tech_merged_duplicates']}")

    # ---- The guarantee the model depends on --------------------------------
    # AI-Specialist is carried over in the OLD shape (skills are bare strings),
    # so read both — the seeder has to tolerate the same mix.
    def skill_name(s):
        return s if isinstance(s, str) else s["name"]

    by_role = {
        r["name"]: {skill_name(s) for d in r["domains"] for s in d["skills"]} for r in roles
    }
    vendor = ("Application-Specific", "Technology-Specific")
    clash = by_role[vendor[0]] & by_role[vendor[1]]
    print(f"\n  App n Tech name collisions     {len(clash)}"
          f"{'  <-- MUST BE 0' if clash else '  (role derivation is deterministic)'}")
    if clash:
        sys.exit(f"Cross-role skill names remain: {sorted(clash)}")


if __name__ == "__main__":
    main()
