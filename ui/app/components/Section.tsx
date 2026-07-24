// Titled container used to group content on a page.

import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { surfaceStyle, subduedText } from "./tokens";

interface SectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Render without the card surface (plain grouping). */
  bare?: boolean;
  style?: React.CSSProperties;
}

export function Section({ title, subtitle, actions, children, bare, style }: SectionProps) {
  return (
    <Flex
      flexDirection="column"
      gap={12}
      padding={bare ? 0 : 16}
      style={{ ...(bare ? {} : surfaceStyle), ...style }}
    >
      {(title || actions) && (
        <Flex justifyContent="space-between" alignItems="center" gap={12}>
          <Flex flexDirection="column" gap={2}>
            {title ? <Heading level={5} style={{ margin: 0 }}>{title}</Heading> : null}
            {subtitle ? <Text style={{ fontSize: 12, color: subduedText }}>{subtitle}</Text> : null}
          </Flex>
          {actions}
        </Flex>
      )}
      {children}
    </Flex>
  );
}
