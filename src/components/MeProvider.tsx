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

  useEffect(() => {
    alive.current = true;
    load();
    // Counts stay live: refetch every 30s while visible and when the tab regains focus.
    const tick = () => document.visibilityState === "visible" && load();
    const t = window.setInterval(tick, 30_000);
    window.addEventListener("focus", load);
    return () => {
      alive.current = false;
      window.clearInterval(t);
      window.removeEventListener("focus", load);
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
