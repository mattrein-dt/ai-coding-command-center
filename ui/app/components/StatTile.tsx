// Compact KPI tile: a big value with a label and optional hint/icon. Used in
// the Overview KPI row and the user-detail Sheet.

import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import type { Tone, IconType } from "../data/taskKind";
import { surfaceStyle, toneColor, subduedText } from "./tokens";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  Icon?: IconType;
  onClick?: () => void;
}

export function StatTile({ label, value, hint, tone = "neutral", Icon, onClick }: StatTileProps) {
  return (
    <Flex
      flexDirection="column"
      gap={4}
      padding={16}
      style={{
        ...surfaceStyle,
        minWidth: 150,
        flex: "1 1 150px",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      <Flex alignItems="center" gap={6} style={{ color: subduedText }}>
        {Icon ? <Icon size={14} /> : null}
        <Text style={{ fontSize: 12, color: subduedText }}>{label}</Text>
      </Flex>
      <Heading level={3} style={{ color: toneColor(tone), margin: 0 }}>
        {value}
      </Heading>
      {hint ? <Text style={{ fontSize: 12, color: subduedText }}>{hint}</Text> : null}
    </Flex>
  );
}
