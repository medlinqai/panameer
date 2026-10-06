import {
  AlignLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey, milestoneDetail } from "@/lib/roadmap-milestones";

type Row = {
  Icon: LucideIcon;
  /** Key into `ROADMAP_MILESTONES`. */
  key: string;
  /** Percent across the four-quarter lane. */
  left: number;
  width: number;
  /** Which bar tone — the lane's only colour variation. */
  tone: "mag" | "violet" | "blue" | "grey";
  value: string;
};

const ROWS: Row[] = [
  {
    Icon: Check,
    key: "invoice_match",
    left: 2,
    width: 9,
    tone: "mag",
    value: "$980K",
  },
  {
    Icon: BarChart3,
    key: "po_price",
    left: 8,
    width: 9,
    tone: "mag",
    value: "$520K",
  },
  {
    Icon: Sparkles,
    key: "rogue_spend",
    left: 28,
    width: 9,
    tone: "violet",
    value: "$610K",
  },
  {
    Icon: FileText,
    key: "contract_reneg",
    left: 54,
    width: 17,
    tone: "blue",
    value: "$265K",
  },
  {
    Icon: AlignLeft,
    key: "supplier_docs",
    left: 79,
    width: 9,
    tone: "grey",
    value: "$215K",
  },
];

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const SLOTS = [
  { day: "Tue", date: "19", time: "10:30 am", taken: false },
  { day: "Wed", date: "20", time: "2:00 pm", taken: true },
  { day: "Thu", date: "21", time: "9:00 am", taken: false },
];

export function AiRoadmapShot() {
  return (
    <div className="rm-wrap">
      <AppShot railActive={2}>
        {}
        <div className="ash-main rm-main">
          <div className="ash-mh">
            <div>
              <h3 className="ash-h3">Procure-to-Pay AI Roadmap — Year 1</h3>
              <p className="ash-sub">
                Built from 23 optimization opportunities · 5 selected
              </p>
            </div>
            <div className="ash-mact">
              {}
              <span className="rm-seg" aria-hidden>
                <span className="is-on">Timeline</span>
                <span>Roadmap</span>
              </span>
              <span className="ash-pill">
                <Calendar className="ash-sv" strokeWidth={1.7} aria-hidden />
                Next 12 months
              </span>
            </div>
          </div>

          {}
          <div className="rm-ex">
            <span className="rm-ex-cam" aria-hidden>
              <svg
                viewBox="0 0 20 20"
                className="ash-sv"
                aria-hidden
                focusable="false"
              >
                <rect
                  x="2.2"
                  y="5.2"
                  width="11.4"
                  height="9.6"
                  rx="2.2"
                  fill="currentColor"
                />
                <path d="M14.4 9.2l3.4-2.4v6.4l-3.4-2.4z" fill="currentColor" />
              </svg>
            </span>
            <span className="rm-ex-t">
              <b>Dana Whitfield</b>
              <span>Panameer expert · Procure-to-Pay</span>
            </span>
            <span className="rm-live">
              <i aria-hidden />
              In session with you
            </span>
          </div>

          {/* ---- the timeline ------------------------------------------- */}
          <div className="rm-tl">
            <div className="rm-hd">
              <span className="rm-hd-a">Action</span>
              <span className="rm-lane" aria-hidden>
                {QUARTERS.map((q) => (
                  <span className="rm-q" key={q}>
                    {q}
                  </span>
                ))}
              </span>
              {}
              <span className="rm-act is-hd" aria-hidden />
            </div>

            {ROWS.map((r) => {
              const m = milestoneByKey(r.key);
              return (
                <div className="rm-row" key={r.key}>
                  <div className="rm-a">
                    <span className="rm-ico" aria-hidden>
                      <r.Icon className="ash-sv" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="rm-at">
                      <b>
                        {m.action}
                        {}
                        <span className="rm-av">{r.value}</span>
                      </b>
                      <span>
                        {milestoneDetail(m)} ·{" "}
                        <span
                          className={
                            "rm-own" + (m.isPartner ? " is-partner" : "")
                          }
                        >
                          {m.owner}
                        </span>
                      </span>
                    </span>
                  </div>
                  {}
                  <div className="rm-lane">
                    <span
                      className={`rm-bar is-${r.tone}`}
                      style={{ left: `${r.left}%`, width: `${r.width}%` }}
                    >
                      <b className="rm-bv">{r.value}</b>
                    </span>
                  </div>
                  {/* THE SOLUTION-LEVEL ACTION (E248) */}
                  <span className="rm-act">
                    <span className="rm-req" aria-hidden>
                      Request
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rm-f">
            {/* A DIRECTIONAL BAND, NOT A POINT FIGURE (decided 2026-08-21) */}
            <span className="rm-tot">
              <span>Year-1 opportunity sequenced</span>
              <b>$1.8M &ndash; $3.2M</b>
              <span className="rm-tot-q">
                directional · sized with you in this session
              </span>
            </span>
            {/* THIS BUTTON IS THE ARGUMENT — `Load into Work Tracker`, never */}
            <span className="rm-btn">
              Load into Work Tracker
              <ArrowRight className="ash-sv" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="rm-note">
            The roadmap lives in Panameer — the tracker picks it up as
            milestones, so the plan and the work you buy against it stay in one
            place.
          </p>
        </div>
      </AppShot>

      {/* NOTHING IN THE ROADMAP MAY BE OBSCURED — same rule and same method as E163's */}
      <aside className="rm-bk">
        <div className="rm-bk-h">
          <span className="rm-bk-av" aria-hidden>
            SW
          </span>
          <span className="rm-bk-n">
            <b>Scott Walls</b>
            <span>Project Coordinator</span>
          </span>
          <span className="rm-bk-len">45 minutes</span>
        </div>
        {/* THE LOAD-BEARING STRING. It answers the objection that actually stops people */}
        <div className="rm-bk-r">
          <i aria-hidden>✓</i>
          <p>
            Has already read your scorecard — every domain, every score, and the
            ranked opportunities.
          </p>
        </div>
        <div className="rm-bk-days">
          {SLOTS.map((s) => (
            <div className={"rm-bk-d" + (s.taken ? " is-off" : "")} key={s.day}>
              <b>{s.day}</b>
              <s>{s.date}</s>
              <em>{s.taken ? "booked" : s.time}</em>
            </div>
          ))}
        </div>
      </aside>

      {/* BOTTOM-RIGHT, MIRRORING THE BOOKING CARD AT BOTTOM-LEFT so the two bracket */}
      <figure className="rm-photo">
        <Image
          src="/work-images/consultation.png"
          alt=""
          width={880}
          height={587}
          sizes="(max-width: 900px) 100vw, 300px"
        />
        <figcaption>
          Your session — 45 minutes, screen shared, no slides.
        </figcaption>
      </figure>
    </div>
  );
}
