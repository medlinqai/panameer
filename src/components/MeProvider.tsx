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
  /**
   * Re-read /api/me (J2.4 WS-B).
   *
   * The shell fetched once and never again, which was fine while nothing inside
   * it could change what the fetch returns. The persona menu's availability
   * toggle can, and so can several Settings pages — without this, the rail chip
   * and the header badge keep showing the state the page loaded with until a
   * hard refresh.
   */
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
  /*
    A ref rather than an effect-local, so a refresh fired from a callback reads
    the same liveness flag the initial load does — otherwise a response arriving
    after unmount would set state on a dead tree.
  */
  const alive = useRef(true);

  const load = useCallback(() => {
    fetch("/api/me")
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
