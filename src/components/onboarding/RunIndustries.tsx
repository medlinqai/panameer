"use client";

import { useEffect, useState } from "react";
import { IndustryAsk } from "@/components/profile/IndustryAsk";

// Scott 10-16: Get Found asks for industries (needed to enable the catalog for professional sellers), so nobody hits it at publish.
export function RunIndustries() {
  const [d, setD] = useState<{ required: boolean; has: boolean; industries: { id: string; name: string }[] } | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch("/api/provider/industries").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, []);
  if (saved) return <p data-industries-saved className="mb-4 text-[13.5px] font-semibold">✓ Industries saved.</p>;
  if (!d || !d.required || d.has || !d.industries.length) return null;
  return <IndustryAsk industries={d.industries} onSaved={() => setSaved(true)} />;
}
