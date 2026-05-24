import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "skiwatch-last-watched";

function readInitial(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function useLastWatched() {
  const [lastWatched, setLastWatched] = useState<string | null>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (lastWatched) {
        window.localStorage.setItem(STORAGE_KEY, lastWatched);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* noop */
    }
  }, [lastWatched]);

  const remember = useCallback((id: string) => {
    setLastWatched(id);
  }, []);

  const forget = useCallback(() => {
    setLastWatched(null);
  }, []);

  return { lastWatched, remember, forget };
}
