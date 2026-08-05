"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/settings/Section";
import { Field, TextInput } from "@/components/onboarding/controls";
import { Badge } from "@/components/Badge";
import { useSettings } from "@/components/settings/useSettings";

export default function IdBadgePage() {
  const { settings, loading, notProvider, setSettings } = useSettings();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setValue(settings.idBadge ?? "");
  }, [settings]);

  if (loading) return <p className="text-ink-2">Loading…</p>;
  if (notProvider || !settings)
    return <p className="text-ink-2">No provider profile found.</p>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const r = await fetch("/api/settings/id-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBadge: value.trim() || null }),
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
      title="Get Your ID Badge"
      description="Your ID badge is a trust signal shown on your profile. Set a badge reference or verification code here."
      onSave={save}
      saving={saving}
      saved={saved}
      error={error}
      footer={
        settings.idBadge ? (
          <Badge tone="green">Badge Set</Badge>
        ) : (
          <Badge>No Badge Yet</Badge>
        )
      }
    >
      <Field label="ID Badge Reference" hint="Simple value for now — no third-party verification in this release.">
        <TextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. VERIFIED-2026-0001"
        />
      </Field>
    </Section>
  );
}
