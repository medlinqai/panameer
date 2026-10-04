import { FileText, Sparkles, type LucideIcon } from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey } from "@/lib/roadmap-milestones";

type Card = {
  /** The resource-type chip. The first card is the selected state. */
  chip: string;
  picked?: true;
  /** Round dark initials for a person; a magenta square icon for a thing. */
  initials?: string;
  Icon?: LucideIcon;
  name: string;
  sub: string;
  facts: [string, string][];
  price: string;
  priceNote: string;
  action: string;
  /** "" outlined magenta · "n" grey outline · "fill" solid magenta */
  actionTone: "" | "n" | "fill";
};

const CARDS: Card[] = [
  {
    chip: "An expert",
    picked: true,
    initials: "RM",
    name: "R. Mehta",
    sub: "Oracle Procurement Lead",
    facts: [
      ["Location", "Austin, TX"],
      ["History", "14 engagements · 4.9"],
      ["Availability", "2 weeks out"],
    ],
    price: 
    "$125/hr",
    priceNote: "proposed rate · est. 4 wks",
    action: "Interview",
    actionTone: "",
  },
  {
    chip: "A service product",
    Icon: FileText,
    name: "Contract Renegotiation Sprint",
    sub: "StratERP",
    facts: [
      ["Scope", "6 deliverables"],
      ["Duration", "4 weeks"],
      ["Delivered", "31 times"],
    ],
    price: "$18,000",
    priceNote: "fixed price · published",
    action: "Review & hire",
    actionTone: "n",
  },
  {
    chip: "A pre-built agent",
    Icon: Sparkles,
    name: "Contract Price Alert Agent",
    sub: "Scott Walls",
    facts: [
      ["Runs", "continuously"],
      ["Setup", "none — connects to your ERP"],
      ["Covers", "off-contract & renewal"],
    ],
    price: "$450/mo",
    priceNote: "fixed price · cancel anytime",
    action: "Deploy",
    actionTone: "fill",
  },
];

export function GetTheTalentShot() {
  const milestone = milestoneByKey("contract_reneg");
  return (
    <AppShot railActive={3}>
      <div className="ash-main">
        <div className="ash-mh">
          <div>
            <h3 className="ash-h3">{milestone.action}</h3>
            <p className="ash-sub">
              From your roadmap · Q3 · three ways to get it done
            </p>
          </div>
          <div className="ash-mact">
            {}
            <span className="ash-pill">Est. savings hidden from providers</span>
          </div>
        </div>

        <div className="gts-three">
          {CARDS.map((c) => (
            <div
              className={"gts-c" + (c.picked ? " is-pick" : "")}
              key={c.chip}
            >
              <span className={"gts-ck" + (c.picked ? "" : " is-n")}>
                {c.chip}
              </span>
              <div className="gts-ch">
                {}
                <span
                  className={"gts-av" + (c.Icon ? " is-sq" : "")}
                  aria-hidden
                >
                  {c.Icon ? (
                    <c.Icon className="ash-sv" strokeWidth={2} aria-hidden />
                  ) : (
                    c.initials
                  )}
                </span>
                <span className="gts-cht">
                  <b>{c.name}</b>
                  <span>{c.sub}</span>
                </span>
              </div>
              <div className="gts-meta">
                {c.facts.map(([k, v]) => (
                  <div key={k}>
                    <u>{k}</u>
                    {v}
                  </div>
                ))}
              </div>
              <div className="gts-price">
                <b>{c.price}</b>
                <span>{c.priceNote}</span>
              </div>
              {/* inert — a span, so nothing can be clicked */}
              <span
                className={
                  "gts-act" + (c.actionTone ? " is-" + c.actionTone : "")
                }
              >
                {c.action}
              </span>
            </div>
          ))}
        </div>

        <p className="gts-note">
          The right resource is whatever the recommendation needs — judgement, a
          known shape, or a rule that should just run.
        </p>
      </div>
    </AppShot>
  );
}
