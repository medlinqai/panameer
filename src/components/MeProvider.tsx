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
    // `no-store` on both ends (WS-3): the route sets the header, this refuses
    // the browser's HTTP cache outright. `refresh()` exists to pick up a change
    // that just happened — a cached response is the one thing that would make
    // it a no-op, and silently.
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
    return () => {
      alive.current = false;
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
