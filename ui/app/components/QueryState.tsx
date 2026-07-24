// Renders loading / error / empty states for a useDql result and hands the row
// records to its child render-prop when data is available.

import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import { ProgressCircle } from "@dynatrace/strato-components/content";
import { CriticalIcon } from "@dynatrace/strato-icons";
import Colors from "@dynatrace/strato-design-tokens/colors";

export interface DqlResultLike {
  isLoading: boolean;
  error?: { message?: string } | null;
  data?: { records?: Array<Record<string, unknown>> | null } | null;
}

interface QueryStateProps {
  result: DqlResultLike;
  empty?: React.ReactNode;
  minHeight?: number;
  children: (records: Array<Record<string, unknown>>) => React.ReactNode;
}

export function QueryState({ result, empty, minHeight = 120, children }: QueryStateProps) {
  const records = result.data?.records ?? [];

  if (result.isLoading && records.length === 0) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ minHeight }}>
        <ProgressCircle aria-label="Loading" />
      </Flex>
    );
  }

  if (result.error) {
    return (
      <Flex alignItems="center" gap={8} style={{ color: Colors.Text.Critical.Default, minHeight }}>
        <CriticalIcon />
        <Text>{result.error.message ?? "Query failed"}</Text>
      </Flex>
    );
  }

  if (records.length === 0) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ minHeight, color: Colors.Text.Neutral.Subdued }}>
        {empty ?? <Text>No data in this timeframe.</Text>}
      </Flex>
    );
  }

  return <>{children(records)}</>;
}
