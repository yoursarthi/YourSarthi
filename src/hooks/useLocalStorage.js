import { useState, useEffect, useCallback } from 'react';

// Session-scoped state: survives in-app tab switches but clears on page refresh/close.
// Pass a factory function as defaultValue to avoid re-running expensive defaults.
export function useLocalStorage(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch {}
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  });

  useEffect(() => {
    try {
      if (state === null || state === undefined) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      if (e?.name === 'QuotaExceededError') {
        console.warn('[useSessionState] Quota exceeded for key:', key);
        sessionStorage.removeItem(key);
      }
    }
  }, [key, state]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(key);
    setState(typeof defaultValue === 'function' ? defaultValue() : defaultValue);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, setState, clear];
}
