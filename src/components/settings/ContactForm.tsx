"use client";

/* ⚠ `Link` LEFT WITH THE SIGNPOST (brief 10 WS-B). Its only use was the
   "edit it there" link to the wizard, which this commit removed — the markup
   is quoted under `E164` at the site it left. ⚠⚠ An unused import is a lint
   warning, i.e. ONE NEW problem against a baseline whose rule is zero.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import Link from "next/link"; */
import { useState } from "react";
import { Card, Input, SaveBar, postSetting } from "@/components/settings/controls";
/* ⚠⚠ THE SAME SHARED BLOCK THE PROFILE EDITOR AND THE EMPLOYER MODAL USE
   (`E123`/`E126`) — country first, because it decides what the fields under it
   mean. ⚠⚠⚠ NOT A SECOND ADDRESS FORM: one provider must not meet two
   different location forms in one sitting. */
import { LocationFields } from "@/components/onboarding/LocationFields";

type EditableAddress = {
  country: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

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
    /* ⚠ SHAPED FOR `LocationFields` — empty strings, not nulls, because the
       inputs are controlled. `getContactInfo` reads it off the backbone. */
    address: EditableAddress;
    memberships: { provider: boolean; buyer: boolean; requester: boolean };
  };
}) {
  const [firstName, setFirstName] = useState(info.firstName);
  const [lastName, setLastName] = useState(info.lastName);
  const [phone, setPhone] = useState(info.phone ?? "");
  const [timeZone, setTimeZone] = useState(info.timeZone ?? "");
  const [address, setAddress] = useState(info.address);

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
        {/*
          ── ⚠⚠⚠ THE ADDRESS ARRIVES, AND THE SIGNPOST LEAVES WITH IT ────────

          ⚠ SCOTT: *"Edit Address → lives in Settings."*
          ⚠⚠ **THIS PAGE USED TO POINT AWAY AT THE WIZARD** — *"Your address
          lives with your profile — edit it there"*, linking
          `/join/provider?step=finish`. ⚠⚠⚠ **THAT SENTENCE AND THE FIELDS
          CANNOT BOTH EXIST**: one says the address is elsewhere while the other
          edits it here. **`69b`: the removal is half the commit.**
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   Your address lives with your profile — <Link
          //   href="/join/provider?step=finish">edit it there</Link>, where it is
          //   checked against the country rules for your region.
          ⚠⚠ **THE COUNTRY RULES CLAIM IS NOT LOST — IT IS NOW TRUE HERE**,
          because `LocationFields` is the block that enforces them.
        */}
        <div className="mt-4">
          <LocationFields
            withStreet
            countryHint="Panameer is global — your country sets how the fields below are labelled."
            value={{
              country: address.country,
              line1: address.line1,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
            }}
            /* ⚠⚠ `undefined` MEANS NOT TOUCHED AND `null` MEANS CLEARED, and the
               two must not collapse — the same normalisation `ContactEditor`
               carries, kept identical so the two callers cannot drift. */
            onChange={(patch) =>
              setAddress((a: EditableAddress) => ({
                ...a,
                ...(patch.country !== undefined ? { country: patch.country ?? "" } : {}),
                ...(patch.line1 !== undefined ? { line1: patch.line1 ?? "" } : {}),
                ...(patch.city !== undefined ? { city: patch.city ?? "" } : {}),
                ...(patch.state !== undefined ? { state: patch.state ?? "" } : {}),
                ...(patch.postalCode !== undefined
                  ? { postalCode: patch.postalCode ?? "" }
                  : {}),
              }))
            }
          />
        </div>
        <SaveBar
          onSave={() =>
            postSetting("/api/settings/contact", {
              phone: phone || null,
              timeZone: timeZone || null,
              /* ⚠ SENT AS AN OBJECT, so the route's Zod keeps it apart from an
                 absent key — ruling 67 at the boundary. */
              address,
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
