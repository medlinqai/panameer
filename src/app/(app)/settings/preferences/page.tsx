"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/settings/Section";
import { useSettings } from "@/components/settings/useSettings";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-brand border border-line p-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-0.5 block text-[14px] text-ink-2">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          "relative mt-1 h-6 w-11 flex-none rounded-full transition-colors " +
          (checked ? "bg-magenta" : "bg-line")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
            (checked ? "left-[22px]" : "left-0.5")
          }
        />
      </button>
    </label>
  );
}

export default function PreferencesPage() {
  const { settings, loading, notProvider, setSettings } = useSettings();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyProduct, setNotifyProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setNotifyEmail(settings.preferences.notifyEmail);
      setNotifyProduct(settings.preferences.notifyProductUpdates);
    }
  }, [settings]);

  if (loading) return <p className="text-ink-2">Loading…</p>;
  if (notProvider || !settings)
    return <p className="text-ink-2">No provider profile found.</p>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const r = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyEmail,
          notifyProductUpdates: notifyProduct,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save.");
        return;
      }
      setSettings(body);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="Change Preferences"
      description="Control the notifications you receive. More preferences coming soon."
      onSave={save}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div className="space-y-3">
        <Toggle
          label="Email Notifications"
          description="Proposals, messages, and engagement updates."
          checked={notifyEmail}
          onChange={setNotifyEmail}
        />
        <Toggle
          label="Product Updates"
          description="Occasional news about new Panameer features."
          checked={notifyProduct}
          onChange={setNotifyProduct}
        />
      </div>
    </Section>
  );
}
