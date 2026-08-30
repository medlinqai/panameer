"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Input, Select, postSetting } from "@/components/settings/controls";

/**
 * Billing methods (J2.4 WS-H / E016) — how the provider pays Panameer.
 *
 * CAPTURE, NOT CHARGING. The payment processor is out of scope, so what this
 * stores is a label and the last four digits: enough for a person to recognise
 * which card they meant, and nothing that would need a PCI-compliant vault. The
 * form says so rather than presenting a card field that looks like a checkout.
 *
 * NO CONNECTS. This is where "buy Connects" lived on the surface being
 * replaced; it does not return as a tile, a balance or a bullet.
 */
type Method = {
  id: string;
  kind: "CARD" | "PAYPAL" | "BANK_DEBIT";
  label: string;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

const KIND_LABEL: Record<Method["kind"], string> = {
  CARD: "Card",
  PAYPAL: "PayPal",
  BANK_DEBIT: "Bank debit",
};

export function BillingMethods({ methods }: { methods: Method[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Method["kind"]>("CARD");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    const err = await postSetting("/api/settings/billing", {
      action: "add",
      kind,
      label,
      last4: last4 || null,
    });
    setError(err);
    setBusy(false);
    if (!err) {
      setLabel("");
      setLast4("");
      router.refresh();
    }
  };

  const remove = async (id: string) => {
    await postSetting("/api/settings/billing", { action: "remove", id });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card
        title="Billing Methods"
        description="What Panameer charges for your membership. Provider Basic is free, so nothing is charged until you move to a paid plan."
      >
        {methods.length === 0 ? (
          <p className="text-[14px] text-ink-2">No billing method on file.</p>
        ) : (
          <ul className="divide-y divide-line">
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
                    {m.last4 ? ` ending ${m.last4}` : ""}
                    {m.expMonth && m.expYear ? ` · expires ${m.expMonth}/${m.expYear}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="text-[13.5px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Add a Billing Method"
        description="Panameer records which method you intend to use. Card details are collected by the payment processor when billing goes live — we never store a full card number."
      >
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Select
            label="Type"
            value={kind}
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
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Amex, personal"
            maxLength={80}
          />
          <Input
            label="Last 4 digits"
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            placeholder="4242"
            maxLength={4}
            hint="So you can tell your methods apart. Optional."
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || label.trim().length === 0}
            onClick={add}
            className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add Method"}
          </button>
          {error && <span className="text-[13.5px] text-red-700">{error}</span>}
        </div>
      </Card>
    </div>
  );
}
