"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card, Input, Select, postSetting } from "@/components/settings/controls";
import { FORM_BLURB, FORM_LABEL, formFor, isUnitedStates } from "@/lib/tax";
import { checkTin, tinFormatMessage } from "@/lib/tin";
import {
  W9_CERTIFICATIONS,
  W9_CERTIFICATION_PREAMBLE,
  W9_CONSENT_NOTICE,
  W8_STUB_NOTICE,
} from "@/lib/w9";

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
  const [tinKind, setTinKind] = useState<"EIN" | "SSN">("EIN");
  const [classification, setClassification] = useState("");
  const [certified, setCertified] = useState(false);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = formFor(country, asEntity);
  const us = isUnitedStates(country);

  const save = async () => {
    setBusy(true);
    /*
      ── ⚠⚠ THE FULL TIN IS VALIDATED AND THEN DISCARDED (`P1-ALL-E404`) ───────

      `tin` holds the whole number while the form is open, because a W-9 that
      shows four digits cannot coherently certify *"the number shown on this
      form is my correct taxpayer identification number."* Only `tinLast4` is
      SENT and only the last four are stored — the existing decision not to hold
      a TIN is unchanged by this row, and no regulated value crosses the wire.
      ⚠ SEE THE REPORT: filing a 1099 will eventually require the full number,
      and that needs encryption at rest before it needs a form field.
    */
    const err = await postSetting("/api/settings/tax", {
      legalName,
      country,
      asEntity,
      tinLast4: tin ? tin.replace(/\D/g, "").slice(-4) : null,
      signedName: signed,
      tinKind: us ? tinKind : null,
      classification: us && classification ? classification : null,
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
          {/* ⚠ THE HARD COPY THE IRS MAY ASK FOR — see `withdrawals/w9`. */}
          {tax.form === "W9" && (
            <>
              {" "}
              <Link
                href="/settings/withdrawals/w9"
                className="font-semibold text-magenta underline"
              >
                View or print your signed form
              </Link>
              .
            </>
          )}
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
        {us && (
          <Select
            label="Your taxpayer ID is an…"
            value={tinKind}
            onChange={(e) => setTinKind(e.target.value as "EIN" | "SSN")}
            hint="A sole proprietor may use either. We ask because the two have different valid formats."
          >
            <option value="EIN">EIN (employer identification number)</option>
            <option value="SSN">SSN (social security number)</option>
          </Select>
        )}
        {us && (
          <Select
            label="Federal tax classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            hint="Line 3 of Form W-9."
          >
            <option value="">Choose…</option>
            <option value="SOLE_PROP_INDIVIDUAL">Individual / sole proprietor</option>
            <option value="C_CORP">C corporation</option>
            <option value="S_CORP">S corporation</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="LLC">Limited liability company</option>
            <option value="NONPROFIT">Other / tax-exempt</option>
          </Select>
        )}
        <Input
          label={us ? `Your ${tinKind}` : "Last 4 of your tax ID"}
          value={tin}
          onChange={(e) => setTin(e.target.value)}
          maxLength={us ? 11 : 4}
          hint={
            us
              ? "Nine digits. We check the format, keep only the last four, and never send it to any third party."
              : "Optional, and display only — the full number isn't stored."
          }
        />
      </div>

      {/* ⚠ FORMAT ONLY, AND IT SAYS SO. `checkTin` cannot confirm the number is
          THEIRS — Panameer is not enrolled in IRS TIN Matching and cannot be
          until it has filed 1099s. A green tick that implied otherwise would be
          the exact failure `E404` WS-2 warns about. */}
      {us && tin.replace(/\D/g, "").length > 0 && (
        <p
          className={
            "mt-2 max-w-xl text-[13px] " +
            (checkTin(tin, tinKind).formatOk ? "text-ink-2" : "text-amber-700")
          }
        >
          {tinFormatMessage(checkTin(tin, tinKind))}
        </p>
      )}

      {/*
        ── ⚠⚠ NON-US STOPS HERE. A WRONG TAX FORM IS WORSE THAN NO TAX FORM ────

        `E404`: do NOT build W-8BEN / W-8BEN-E in this pass. They carry different
        certifications, and showing W-9 wording to a non-US payee would collect a
        signature on a statement that is false for them. The US question is
        answered by `lib/tax.ts` from the payout country — jurisdiction decides,
        not the user — and everyone else is told which form they need and stopped.
      */}
      {!us ? (
        <div className="mt-4 max-w-xl rounded-[10px] border border-amber-400/60 bg-amber-50 p-4">
          <p className="text-[13.5px] font-bold">{FORM_LABEL[form]} is needed</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{W8_STUB_NOTICE}</p>
        </div>
      ) : (
        <div className="mt-4 max-w-xl rounded-[10px] border border-line bg-black/[0.02] p-4">
          <p className="text-[13.5px] font-bold">Substitute {FORM_LABEL[form]}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{FORM_BLURB[form]}</p>

          {/*
            ⚠⚠ BOXED AND BOLD ON PURPOSE, NOT FOR EMPHASIS. The IRS requires that
            where a substitute form's signature line covers anything besides the
            certifications, the certification language be *"highlighted, boxed,
            printed in bold-face type, or presented in some other manner that
            causes the language to stand out."* The border and the bold preamble
            are that requirement, not a design choice — do not flatten them.
          */}
          <div className="mt-3 rounded-[10px] border-2 border-ink/25 bg-white p-4">
            <p className="text-[13.5px] font-extrabold uppercase tracking-[0.03em]">
              {W9_CERTIFICATION_PREAMBLE}
            </p>
            <ul className="mt-2 space-y-2">
              {W9_CERTIFICATIONS.map((c) => (
                <li key={c} className="text-[13px] leading-relaxed text-ink">
                  {c}
                </li>
              ))}
            </ul>
            {/* ⚠ VERBATIM, DIRECTLY ABOVE THE SIGNATURE. Not a paraphrase. */}
            <p className="mt-3 border-t border-line pt-3 text-[13px] font-semibold leading-relaxed">
              {W9_CONSENT_NOTICE}
            </p>
          </div>

          <label className="mt-3 flex items-start gap-2.5 text-[13px] leading-relaxed">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none"
            />
            <span>
              I have read the certifications above and I make them under penalties
              of perjury.
            </span>
          </label>

          <div className="mt-3 max-w-sm">
            <Input
              label="Type your full name to sign"
              value={signed}
              onChange={(e) => setSigned(e.target.value)}
              placeholder="Your full legal name"
              maxLength={160}
              hint="Typing your name is your signature on this form."
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          /*
            ⚠⚠ A US SIGNATURE REQUIRES THE CERTIFICATION TICK AND A CLASSIFICATION.
            The button is a courtesy — `saveTaxProfile` writes the certification
            text on every W-9 regardless — but a signature collected without the
            signer having ticked the perjury statement is not a certification,
            and this is where that is refused.
            ⚠ NON-US CANNOT SIGN AT ALL: there is no form to sign yet, so the
            button stays disabled and the stub explains why.
          */
          disabled={
            busy ||
            !legalName.trim() ||
            !signed.trim() ||
            !us ||
            !certified ||
            !classification
          }
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
