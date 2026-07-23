"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Me } from "@/lib/types";

type MeState = { me: Me | null; loading: boolean; error: boolean };

const MeContext = createContext<MeState>({
  me: null,
  loading: true,
  error: false,
});

/** Fetches /api/me once and shares it with the whole authenticated shell. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MeState>({
    me: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((me: Me) => {
        if (alive) setState({ me, loading: false, error: false });
      })
      .catch(() => {
        if (alive) setState({ me: null, loading: false, error: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  return <MeContext.Provider value={state}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  return useContext(MeContext);
}
