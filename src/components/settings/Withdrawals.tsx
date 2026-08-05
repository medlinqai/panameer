"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Input, Select, postSetting } from "@/components/settings/controls";
import { FORM_BLURB, FORM_LABEL, formFor, isUnitedStates } from "@/lib/tax";

/**
 * Withdrawals (J2.4 WS-H / E017) — the seller money-gate.
 *
 * THE ORDER ON THE PAGE IS THE RULE. Tax profile first, methods second, and the
 * second is disabled until the first exists. The lib enforces it regardless of
 * what this component renders, but a page that offered both and then rejected
 * the second would be teaching the rule by failure instead of by layout.
 *
 * WHICH FORM APPLIES IS DERIVED from the country, and shown before you fill
 * anything in. Asking someone to choose between a W-9 and a W-8 is asking a tax
 * question most people cannot answer, and the wrong answer has consequences on
 * both sides.
 */
type Tax = {
  form: "W9" | "W8BEN" | "W8BENE";
  legalName: string;
  country: string;
  tinLast4: string | null;
  signedAt: string;
};

type Method = {
  id: string;
  kind: "BANK_ACCOUNT" | "PAYPAL" | "WIRE";
  label: string;
  last4: string | null;
  country: string;
  isDefault: boolean;
};

const KIND_LABEL: Record<Method["kind"], string> = {
  BANK_ACCOUNT: "Bank account",
  PAYPAL: "PayPal",
  WIRE: "International wire",
};

export function Withdrawals({
  tax,
  methods,
}: {
  tax: Tax | null;
  methods: Method[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card
        title="Available Balance"
        description="What Panameer is holding for you."
      >
        {/*
          A DASH, NOT "$0.00". There is no settlement engine yet, so a zero here
          would be a measurement we have not made — the same rule My Stats
          follows. Nobody should read "you have earned nothing" off a page that
          simply cannot count.
        */}
        <p className="font-display text-[30px] font-bold leading-none text-ink-2/25">
          —
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          Balances appear once work orders settle on Panameer. Nothing is being
          held back — there is nothing to hold yet.
        </p>
      </Card>

      <TaxSection tax={tax} onSaved={() => router.refresh()} />

      <MethodsSection
        methods={methods}
        gated={!tax}
        country={tax?.country ?? ""}
        onChanged={() => router.refresh()}
      />

      <Card title="Withdrawal Schedule">
        <p className="text-[14px] leading-relaxed text-ink-2">
          Withdrawals run when settlement goes live. You&apos;ll be able to choose
          weekly, monthly or on-demand from here; until there is money to move,
          setting a schedule would be scheduling nothing.
        </p>
      </Card>

      <Card title="Recent Withdrawals">
        <p className="text-[14px] text-ink-2">No withdrawals yet.</p>
      </Card>
    </div>
  );
}

function TaxSection({ tax, onSaved }: { tax: Tax | null; onSaved: () => void }) {
  const [legalName, setLegalName] = useState(tax?.legalName ?? "");
  const [country, setCountry] = useState(tax?.country ?? "United States");
  const [asEntity, setAsEntity] = useState(tax?.form === "W8BENE");
  const [tin, setTin] = useState("");
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = formFor(country, asEntity);
  const us = isUnitedStates(country);

  const save = async () => {
    setBusy(true);
    const err = await postSetting("/api/settings/tax", {
      legalName,
      country,
      asEntity,
      tinLast4: tin || null,
      signedName: signed,
    });
    setError(err);
    setBusy(false);
    if (!err) {
      setSigned("");
      setTin("");
      onSaved();
    }
  };

  return (
    <Card
      title="Tax Details"
      description="Panameer can't pay you until this is on file. Which form applies is decided by where you're taxed, not by you — so it's shown rather than asked."
    >
      {tax && (
        <p className="mb-4 rounded-[10px] border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-[13.5px]">
          <b className="text-emerald-800">{FORM_LABEL[tax.form]} on file</b> —{" "}
          {tax.legalName}, {tax.country}
          {tax.tinLast4 ? `, ending ${tax.tinLast4}` : ""}. Signed {tax.signedAt}.
        </p>
      )}

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <Input
          label="Legal name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="As it appears on your tax records"
          maxLength={160}
        />
        <Input
          label="Country of tax residence"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          maxLength={80}
        />
        {!us && (
          <Select
            label="Paid as"
            value={asEntity ? "entity" : "individual"}
            onChange={(e) => setAsEntity(e.target.value === "entity")}
            hint="A company being paid files differently from a person."
          >
            <option value="individual">An individual</option>
            <option value="entity">A company</option>
          </Select>
        )}
        <Input
          label={us ? "Last 4 of your TIN/SSN" : "Last 4 of your tax ID"}
          value={tin}
          onChange={(e) => setTin(e.target.value)}
          maxLength={4}
          hint="Optional, and display only — the full number isn't stored."
        />
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-black/[0.02] p-4">
        <p className="text-[13.5px] font-bold">{FORM_LABEL[form]}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          {FORM_BLURB[form]}
        </p>
        <div className="mt-3 max-w-sm">
          <Input
            label="Type your full name to sign"
            value={signed}
            onChange={(e) => setSigned(e.target.value)}
            placeholder="Your full legal name"
            maxLength={160}
            hint="Typing your name here is your certification that the details above are true."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !legalName.trim() || !signed.trim()}
          onClick={save}
          className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : tax ? "Update Tax Details" : "Save Tax Details"}
        </button>
        {error && <span className="text-[13.5px] text-red-700">{error}</span>}
      </div>
    </Card>
  );
}

function MethodsSection({
  methods,
  gated,
  country,
  onChanged,
}: {
  methods: Method[];
  gated: boolean;
  country: string;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<Method["kind"]>("BANK_ACCOUNT");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    const err = await postSetting("/api/settings/withdrawals", {
      action: "add",
      kind,
      label,
      last4: last4 || null,
      country: country || "United States",
    });
    setError(err);
    setBusy(false);
    if (!err) {
      setLabel("");
      setLast4("");
      onChanged();
    }
  };

  return (
    <Card
      title="Withdrawal Methods"
      description="Where Panameer sends your money. Account details are collected by the payment processor when settlement goes live — we store a label and the last four digits."
    >
      {gated && (
        <p className="mb-4 rounded-[10px] border border-magenta/30 bg-magenta/[0.05] px-3 py-2.5 text-[13.5px]">
          Add your tax details above first. Panameer can&apos;t pay anyone without
          a form on file.
        </p>
      )}

      {methods.length > 0 && (
        <ul className="mb-4 divide-y divide-line">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold">
                  {m.label}
                  {m.isDefault && (
                    <span className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-magenta">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-[13px] text-ink-2">
                  {KIND_LABEL[m.kind]}
                  {m.last4 ? ` ending ${m.last4}` : ""} · {m.country}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await postSetting("/api/settings/withdrawals", {
                    action: "remove",
                    id: m.id,
                  });
                  onChanged();
                }}
                className="text-[13.5px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <Select
          label="Type"
          value={kind}
          disabled={gated}
          onChange={(e) => setKind(e.target.value as Method["kind"])}
        >
          {(Object.keys(KIND_LABEL) as Method["kind"][]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
        <Input
          label="Name it"
          value={label}
          disabled={gated}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Barclays current account"
          maxLength={80}
        />
        <Input
          label="Last 4 digits"
          value={last4}
          disabled={gated}
          onChange={(e) => setLast4(e.target.value)}
          maxLength={4}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={gated || busy || label.trim().length === 0}
          onClick={add}
          className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add Withdrawal Method"}
        </button>
        {error && <span className="text-[13.5px] text-red-700">{error}</span>}
      </div>
    </Card>
  );
}
