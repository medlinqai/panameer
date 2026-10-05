"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* deliberate: same outcome */
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper p-6 font-body">
      <div className="w-full max-w-sm space-y-4 rounded-brand border border-line bg-white p-8">
        <div className="space-y-1 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="pt-2 font-display text-[20px] font-bold">Reset your password</h1>
        </div>

        {sent ? (
          <>
            <p className="text-sm leading-relaxed text-ink-2">
              If that address has an account, a reset link is on its way. The link
              works once and expires in an hour.
            </p>
            <p className="text-center text-[13px] text-ink-2">
              <a href="/login" className="underline transition-colors hover:text-ink">
                Back to sign in
              </a>
            </p>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-2">
              Enter the email address you signed up with and we&apos;ll send you a
              link to choose a new password.
            </p>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-magenta px-4 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <p className="text-center text-[13px] text-ink-2">
              <a href="/login" className="underline transition-colors hover:text-ink">
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
