// Thin wrapper over useDql that injects the app-wide timeframe, so callers just
// pass a DQL string. Returns the standard useDql surface ({ data, error,
// isLoading, refetch, ... }); `data.records` are the row objects.

import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeframe } from "./timeframe";

export function useTimeframedDql(query: string) {
  const { tf } = useTimeframe();
  // The query API expects absolute ISO timestamps (not DQL "now()-7d" strings).
  // Derive them once per timeframe change, floored to the minute so the values
  // stay stable across renders and don't trigger a refetch loop.
  const { start, end } = useMemo(() => {
    const now = Date.now();
    const floored = now - (now % 60000);
    return {
      end: new Date(floored).toISOString(),
      start: new Date(floored - tf.hours * 3600_000).toISOString(),
    };
  }, [tf.hours]);

  return useDql({
    query,
    defaultTimeframeStart: start,
    defaultTimeframeEnd: end,
  });
}

/** Coerce DQL string/number cells to a JS number (Grail returns big ints as strings). */
export function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
