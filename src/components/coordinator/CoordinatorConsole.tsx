"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";

type Roster = {
  coordinatorName: string;
  providers: {
    id: string;
    name: string;
    headline: string | null;
    status: "PENDING" | "ACTIVE";
    validationStatus: "NOT_REQUESTED" | "REQUESTED" | "VALIDATED" | "REJECTED";
    completeness: number;
    visible: boolean;
  }[];
  pendingInvites: {
    id: string;
    email: string;
    name: string | null;
    invitedAt: string;
    expiresAt: string;
  }[];
};

export function CoordinatorConsole() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const load = () =>
    fetch("/api/coordinator/roster")
      .then((r) => (r.ok ? r.json() : null))
      .then(setRoster)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
    setBusy(true);
    setMsg(null);
    setDevLink(null);
    try {
      const r = await fetch("/api/coordinator/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ tone: "error", text: body.error ?? "Could not send invite." });
        return;
      }
      setMsg({ tone: "info", text: `Invitation sent to ${form.email}.` });
      if (body.devLink) setDevLink(body.devLink);
      setForm({ email: "", firstName: "", lastName: "", message: "" });
      load();
    } finally {
      setBusy(false);
    }
  };

  const act = async (path: string, inviteId: string) => {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok && body.devLink) setDevLink(body.devLink);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Invite a Provider */}
      <Card>
        <h2 className="text-lg font-semibold">Invite a Provider</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Send a tokenized invitation. New providers join through onboarding;
          existing ones are linked to you when they accept.
        </p>
        <div className="mt-4 space-y-4">
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {devLink && (
            <Notice tone="info">
              Dev mode (no RESEND_API_KEY): invite link{" "}
              <a href={devLink} className="font-bold underline">
                here
              </a>
              .
            </Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider Email">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="provider@example.com"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name (Optional)">
                <TextInput
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </Field>
              <Field label="Last Name (Optional)">
                <TextInput
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <Field label="Message (Optional)">
            <TextArea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="A short note to include in the invitation…"
              className="min-h-20"
            />
          </Field>
          <button
            onClick={invite}
            disabled={busy || !form.email.trim()}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Invitation"}
          </button>
        </div>
      </Card>

      {/* My Providers roster */}
      <Card>
        <h2 className="text-lg font-semibold">My Providers</h2>
        {!roster ? (
          <p className="mt-3 text-sm text-black/50 dark:text-white/50">Loading…</p>
        ) : (
          <div className="mt-4 space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Providers ({roster.providers.length})
              </p>
              {roster.providers.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No providers yet. Invite one above.
                </p>
              ) : (
                <ul className="space-y-2">
                  {roster.providers.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        {p.headline && (
                          <p className="truncate text-sm text-black/60 dark:text-white/60">
                            {p.headline}
                          </p>
                        )}
                        <p className="text-xs text-black/50 dark:text-white/50">
                          {p.completeness}% complete
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {p.validationStatus === "VALIDATED" && (
                          <Badge tone="green">✓ Validated</Badge>
                        )}
                        <Badge tone={p.visible ? "green" : "neutral"}>
                          {p.visible ? "Live" : "Not Visible"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Pending invites ({roster.pendingInvites.length})
              </p>
              {roster.pendingInvites.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No pending invites.
                </p>
              ) : (
                <ul className="space-y-2">
                  {roster.pendingInvites.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {i.name ? `${i.name} · ` : ""}
                          {i.email}
                        </p>
                        <p className="text-sm text-black/50 dark:text-white/50">
                          Invited — Pending
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => act("/api/coordinator/invite/resend", i.id)}
                          className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => act("/api/coordinator/invite/revoke", i.id)}
                          className="rounded-full border border-red-600/20 px-4 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-600/5"
                        >
                          Revoke
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
