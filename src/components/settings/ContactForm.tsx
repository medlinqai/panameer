"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Input, SaveBar, postSetting } from "@/components/settings/controls";

/**
 * Contact Info (J2.4 WS-H / E014).
 *
 * THE ADDITIONAL-ACCOUNTS BLOCK IS THE INTERESTING ONE. "Client Account" and
 * "Agency Account" add a BUYER or RECRUITER membership to this login — they do
 * not create a second login, which is what the surface this replaces did. One
 * person, one password, several hats: that is the locked model, and a UI that
 * quietly minted a second account would contradict it on the page where it is
 * most visible.
 *
 * Neither is wired to a join flow yet, so both say so rather than presenting a
 * button that does nothing. Getting the MODEL right on screen is what this
 * workstream owes; the flows behind them are their own journeys (P1-J1.2 for
 * the buyer side).
 */
export function ContactForm({
  info,
}: {
  info: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    timeZone: string | null;
    company: { id: string; name: string } | null;
    memberships: { provider: boolean; buyer: boolean; requester: boolean };
  };
}) {
  const [firstName, setFirstName] = useState(info.firstName);
  const [lastName, setLastName] = useState(info.lastName);
  const [phone, setPhone] = useState(info.phone ?? "");
  const [timeZone, setTimeZone] = useState(info.timeZone ?? "");

  return (
    <div className="space-y-4">
      <Card title="Account">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={80}
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={80}
          />
          <Input
            label="Email"
            value={info.email ?? ""}
            disabled
            hint="Changing your sign-in email goes through verification — from Password & Security."
          />
          <Input
            label="User ID"
            value={info.userId}
            disabled
            hint="Quote this if you contact support."
          />
        </div>
        <SaveBar
          onSave={() =>
            postSetting("/api/settings/contact", { firstName, lastName })
          }
        />
      </Card>

      <Card
        title="Additional Accounts"
        description="One login, several memberships. Adding one of these gives this same account another role on Panameer — it does not create a second login or a second password."
      >
        <ul className="space-y-3">
          <MembershipRow
            title="Provider"
            blurb="Sell your own time and service packages."
            active={info.memberships.provider}
          />
          <MembershipRow
            title="Client Account"
            blurb="Buy services — post work requests and hire providers. Adds a Buyer membership."
            active={info.memberships.buyer || info.memberships.requester}
          />
          <MembershipRow
            title="Agency Account"
            blurb="Represent other providers and bid on their behalf. Adds a Recruiter membership."
            active={false}
          />
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          Adding a membership isn&apos;t self-service yet — the buyer and agency
          onboarding flows are being built. Nothing here creates an account
          behind your back in the meantime.
        </p>
      </Card>

      <Card title="Location">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 010 4477"
            maxLength={40}
          />
          <Input
            label="Time zone"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            placeholder="America/New_York"
            hint="IANA name. Leave blank to use whatever your browser reports."
            maxLength={60}
          />
        </div>
        <p className="mt-3 text-[13px] text-ink-2">
          Your address lives with your profile —{" "}
          <Link
            href="/join/provider?step=finish"
            className="font-semibold text-magenta hover:underline"
          >
            edit it there
          </Link>
          , where it is checked against the country rules for your region.
        </p>
        <SaveBar
          onSave={() =>
            postSetting("/api/settings/contact", {
              phone: phone || null,
              timeZone: timeZone || null,
            })
          }
        />
      </Card>
    </div>
  );
}

function MembershipRow({
  title,
  blurb,
  active,
}: {
  title: string;
  blurb: string;
  active: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{blurb}</p>
      </div>
      <span
        className={
          "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide " +
          (active ? "bg-emerald-100 text-emerald-800" : "bg-black/[0.06] text-ink-2")
        }
      >
        {active ? "Active" : "Not added"}
      </span>
    </li>
  );
}
