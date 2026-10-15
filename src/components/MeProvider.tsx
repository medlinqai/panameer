"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Me } from "@/lib/types";

type MeState = {
  me: Me | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};

const MeContext = createContext<MeState>({
  me: null,
  loading: true,
  error: false,
  refresh: () => {},
});

/** Fetches /api/me for the whole authenticated shell, and re-fetches on demand. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<MeState, "refresh">>({
    me: null,
    loading: true,
    error: false,
  });
  const alive = useRef(true);

  const load = useCallback(() => {
    // the browser's HTTP cache outright. `refresh()` exists to pick up a change
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((me: Me) => {
        if (alive.current) setState({ me, loading: false, error: false });
      })
      .catch(() => {
        if (alive.current) setState({ me: null, loading: false, error: true });
      });
  }, []);

  const last = useRef(0);
  useEffect(() => {
    alive.current = true;
    last.current = Date.now();
    load();
    // DC-E005: once per page, then only when the tab comes back into view after ≥15s (some browsers fire focus constantly).
    const back = () => {
      if (document.visibilityState !== "visible" || Date.now() - last.current < 15_000) return;
      last.current = Date.now();
      load();
    };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => {
      alive.current = false;
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, [load]);

  return (
    <MeContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeState {
  return useContext(MeContext);
}
