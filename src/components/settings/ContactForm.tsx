"use client";

import { useState } from "react";
import { Card, Input, SaveBar, postSetting } from "@/components/settings/controls";
import { LocationFields } from "@/components/onboarding/LocationFields";

type EditableAddress = {
  country: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

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
    address: EditableAddress;
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

      {}
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
        {}
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
              address,
            })
          }
        />
      </Card>
    </div>
  );
}

