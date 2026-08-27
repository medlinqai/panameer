"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Input, Select, postSetting } from "@/components/settings/controls";

/**
 * Password & Security (J2.4 WS-H / E018).
 *
 * REAL TOTP. The secret is minted server-side, shown once, and two-step only
 * turns on when a live code proves the authenticator holds it — an unconfirmed
 * enrollment leaves the account exactly as it was, which is what stops a
 * mistyped scan locking somebody out.
 *
 * MOBILE-PUSH 2FA IS DEFERRED with the app that would receive it, and the page
 * says so rather than showing a greyed row that implies it is nearly here.
 *
 * LINKEDIN IS ABSENT. It was removed from the product in PJv2 WS2; a
 * "disconnected" row for something we will never offer is a promise, not a
 * status.
 */
const QUESTIONS = [
  "What was the name of your first school?",
  "What was your first employer's name?",
  "What city were you born in?",
  "What was the make of your first car?",
];

type Security = {
  email: string;
  hasPassword: boolean;
  connected: { google: boolean; apple: boolean };
  totp: { enabled: boolean; pending: boolean };
  securityQuestion: string | null;
};

export function SecurityPanel({ security }: { security: Security }) {
  return (
    <div className="space-y-4">
      <PasswordCard hasPassword={security.hasPassword} />
      <ConnectionsCard connected={security.connected} />
      <TotpCard enabled={security.totp.enabled} />
      <QuestionCard current={security.securityQuestion} />
    </div>
  );
}

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!hasPassword) {
    return (
      <Card title="Password">
        <p className="text-[14px] text-ink-2">
          This account signs in with Google or Apple, so there&apos;s no password
          to change.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Password"
      description="Your current password is required — a change form that doesn't ask for it hands the account to whoever is sitting at an open laptop."
    >
      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <Input
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="New password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          hint="At least 10 characters."
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !current || next.length < 10}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const err = await postSetting("/api/settings/security", {
              action: "password",
              current,
              next,
            });
            setBusy(false);
            if (err) setMsg({ ok: false, text: err });
            else {
              setMsg({ ok: true, text: "Password changed." });
              setCurrent("");
              setNext("");
            }
          }}
          className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Changing…" : "Change Password"}
        </button>
        {msg && (
          <span
            className={
              "text-[13.5px] " +
              (msg.ok ? "font-semibold text-emerald-600" : "text-red-700")
            }
          >
            {msg.ok ? `✓ ${msg.text}` : msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}

function ConnectionsCard({
  connected,
}: {
  connected: { google: boolean; apple: boolean };
}) {
  return (
    <Card
      title="Connected Sign-Ins"
      description="Sign in with an account you already have instead of a password."
    >
      <ul className="divide-y divide-line">
        {(["google", "apple"] as const).map((p) => (
          <li key={p} className="flex items-center justify-between gap-4 py-3">
            <span className="text-[14.5px] font-semibold capitalize">{p}</span>
            <span className="text-[13.5px] text-ink-2">
              {connected[p] ? "Connected" : "Not connected"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        Connecting and disconnecting happens at sign-in. Both providers are wired
        and switch on when Panameer&apos;s OAuth credentials are configured.
      </p>
    </Card>
  );
}

function TotpCard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/settings/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(data.error ?? "That didn't work.");
      return null;
    }
    return data.result ?? {};
  };

  return (
    <Card
      title="Two-Step Verification"
      description="A six-digit code from an authenticator app, on top of your password."
    >
      {enabled ? (
        <>
          <p className="text-[14px] font-semibold text-emerald-700">
            ✓ Two-step verification is on.
          </p>
          <div className="mt-3 max-w-xs">
            <Input
              label="Enter a current code to turn it off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || code.length < 6}
              onClick={async () => {
                const ok = await call({ action: "totp-disable", code });
                if (ok) router.refresh();
              }}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 text-[14.5px] font-bold text-ink-2 transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
            >
              Turn Off
            </button>
            {error && <span className="text-[13.5px] text-red-700">{error}</span>}
          </div>
        </>
      ) : setup ? (
        <>
          <p className="text-[14px] leading-relaxed text-ink-2">
            Scan this in your authenticator app, or paste the key in by hand —
            you can&apos;t scan the screen you&apos;re reading.
          </p>
          <p className="mt-3 break-all rounded-[10px] border border-line bg-black/[0.02] px-3 py-2.5 font-mono text-[13.5px]">
            {setup.secret}
          </p>
          <p className="mt-2 break-all text-[12px] text-ink-2">{setup.uri}</p>
          <div className="mt-4 max-w-xs">
            <Input
              label="Enter the code it shows"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || code.length < 6}
              onClick={async () => {
                const ok = await call({ action: "totp-confirm", code });
                if (ok) {
                  setSetup(null);
                  setCode("");
                  router.refresh();
                }
              }}
              className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Checking…" : "Turn On Two-Step"}
            </button>
            {error && <span className="text-[13.5px] text-red-700">{error}</span>}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const result = await call({ action: "totp-begin" });
              if (result?.secret) setSetup(result);
            }}
            className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Setting up…" : "Set Up Authenticator App"}
          </button>
          {error && <span className="text-[13.5px] text-red-700">{error}</span>}
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
        Push notifications to a phone are a second option we&apos;ll add with the
        Panameer mobile app. There isn&apos;t one yet, so it isn&apos;t offered
        here.
      </p>
    </Card>
  );
}

function QuestionCard({ current }: { current: string | null }) {
  const router = useRouter();
  const [question, setQuestion] = useState(current ?? QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <Card
      title="Security Question"
      description="Used to confirm it's you if you ever lose access to both your password and your authenticator."
    >
      {current && (
        <p className="mb-3 text-[13.5px] text-ink-2">
          Currently set: <b className="text-ink">{current}</b>
        </p>
      )}
      <div className="grid max-w-xl gap-3">
        <Select
          label="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        >
          {QUESTIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </Select>
        <Input
          label="Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          hint="Stored hashed, like a password — capitalisation and spacing don't matter."
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || answer.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const err = await postSetting("/api/settings/security", {
              action: "question",
              question,
              answer,
            });
            setBusy(false);
            if (err) setMsg({ ok: false, text: err });
            else {
              setMsg({ ok: true, text: "Saved." });
              setAnswer("");
              router.refresh();
            }
          }}
          className="rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : current ? "Update Question" : "Set Question"}
        </button>
        {msg && (
          <span
            className={
              "text-[13.5px] " +
              (msg.ok ? "font-semibold text-emerald-600" : "text-red-700")
            }
          >
            {msg.ok ? `✓ ${msg.text}` : msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}
