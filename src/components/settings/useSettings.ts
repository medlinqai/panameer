"use client";

import { useCallback, useEffect, useState } from "react";

export type ProviderSettings = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  headline: string;
  overview: string;
  experienceLevel: string;
  goal: string;
  workTypes: string[];
  roleTypeId: string | null;
  skillIds: string[];
  skillNames: { id: string; name: string }[];
  onsiteRateCents: number | null;
  remoteRateCents: number | null;
  currency: string;
  regionId: string | null;
  region: { id: string; name: string } | null;
  idBadge: string | null;
  status: "PENDING" | "ACTIVE";
  validationStatus: "NOT_REQUESTED" | "REQUESTED" | "VALIDATED" | "REJECTED";
  completeness: number;
  visibilityThreshold: number;
  paused: boolean;
  visible: boolean;
  rating: number | null;
  preferences: { notifyEmail: boolean; notifyProductUpdates: boolean };
  experiences: {
    employer: string;
    roleTitle: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    projects: { name: string; description: string | null }[];
  }[];
  education: {
    institution: string;
    degree: string | null;
    field: string | null;
    year: number | null;
  }[];
  languages: { name: string; proficiency: string | null }[];
  certifications: { name: string; issuer: string | null; year: number | null }[];
};

type State = {
  settings: ProviderSettings | null;
  loading: boolean;
  notProvider: boolean;
};

/** Loads /api/settings/profile once; exposes a setter so pages can apply saves. */
export function useSettings() {
  const [state, setState] = useState<State>({
    settings: null,
    loading: true,
    notProvider: false,
  });

  const load = useCallback(async () => {
    const r = await fetch("/api/settings/profile");
    if (r.status === 404) {
      setState({ settings: null, loading: false, notProvider: true });
      return;
    }
    if (r.ok) {
      const s = await r.json();
      setState({ settings: s, loading: false, notProvider: false });
    } else {
      setState({ settings: null, loading: false, notProvider: false });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSettings = (s: ProviderSettings) =>
    setState((prev) => ({ ...prev, settings: s }));

  return { ...state, setSettings, reload: load };
}
