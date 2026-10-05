"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PasswordReveal } from "@/components/PasswordReveal";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.ok) setDone(true);
      else setError(body?.error ?? "That link isn't valid. Request a new one and try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          Your password has been changed. You can sign in now.
        </p>
        <a
          href="/login"
          className="block w-full bg-magenta px-4 py-3 text-center font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Go to Sign In
        </a>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          That link isn&apos;t valid. Request a new one and try again.
        </p>
        <a href="/forgot-password" className="block text-center text-[13px] text-ink-2 underline hover:text-ink">
          Request a new link
        </a>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium">
        New password
        <PasswordReveal id="reset-password">
          {({ type, className }) => (
            <input
              id="reset-password"
              type={type}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={`mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta ${className}`}
            />
          )}
        </PasswordReveal>
      </label>
      <label className="block text-sm font-medium">
        Confirm new password
        <PasswordReveal id="reset-password-confirm">
          {({ type, className }) => (
            <input
              id="reset-password-confirm"
              type={type}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={`mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta ${className}`}
            />
          )}
        </PasswordReveal>
      </label>
      <p className="text-[13px] text-ink-2">At least 8 characters.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-magenta px-4 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save New Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper p-6 font-body">
      <div className="w-full max-w-sm space-y-4 rounded-brand border border-line bg-white p-8">
        <div className="space-y-1 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="pt-2 font-display text-[20px] font-bold">Choose a new password</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-ink-2">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
