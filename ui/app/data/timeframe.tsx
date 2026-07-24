// App-wide timeframe. A small set of DQL-relative presets kept in React context
// so every page queries the same window; the picker lives in the header. Each
// useDql call passes `start`/`end` as defaultTimeframeStart/defaultTimeframeEnd.

import React, { createContext, useContext, useMemo, useState } from "react";
import { Select, SelectOption } from "@dynatrace/strato-components/forms";

export interface Timeframe {
  key: string;
  label: string;
  hours: number; // window length; ISO start/end are derived at query time
}

export const TIMEFRAME_PRESETS: Timeframe[] = [
  { key: "24h", label: "Last 24 hours", hours: 24 },
  { key: "7d", label: "Last 7 days", hours: 24 * 7 },
  { key: "30d", label: "Last 30 days", hours: 24 * 30 },
  { key: "90d", label: "Last 90 days", hours: 24 * 90 },
];

const DEFAULT_KEY = "7d";

interface TimeframeCtx {
  tf: Timeframe;
  setKey: (key: string) => void;
}

const Ctx = createContext<TimeframeCtx | null>(null);

export function TimeframeProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<string>(DEFAULT_KEY);
  const value = useMemo<TimeframeCtx>(() => {
    const tf = TIMEFRAME_PRESETS.find((p) => p.key === key) ?? TIMEFRAME_PRESETS[1];
    return { tf, setKey };
  }, [key]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimeframe(): TimeframeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimeframe must be used within TimeframeProvider");
  return ctx;
}

/** Header control for choosing the timeframe. */
export function TimeframePicker() {
  const { tf, setKey } = useTimeframe();
  return (
    <Select
      name="timeframe"
      value={tf.key}
      onChange={(v) => setKey((v as string) ?? DEFAULT_KEY)}
      style={{ minWidth: 180 }}
    >
      {TIMEFRAME_PRESETS.map((p) => (
        <SelectOption key={p.key} value={p.key}>
          {p.label}
        </SelectOption>
      ))}
    </Select>
  );
}
