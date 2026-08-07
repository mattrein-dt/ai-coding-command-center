// Sessions tab: one row per coding session; clicking a row opens the session
// detail (span tree). Supports deep-linking via ?session=<id> so the Overview
// and user detail can jump straight to a session.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableRef } from "@dynatrace/strato-components/tables";
import { CheckmarkIcon } from "@dynatrace/strato-icons";

import { Section } from "../components/Section";
import { QueryState } from "../components/QueryState";
import { toneColor, subduedText } from "../components/tokens";
import { useTimeframedDql, num } from "../data/useQuery";
import { fmtInt, fmtTokens, fmtUSD, fmtDuration, fmtTime } from "../data/normalize";
import { sessionsQuery } from "../data/queries";
import { assistantBrandIcon } from "../components/brandIcons";
import { CenterCell } from "../components/CenterCell";
import { SessionDetail } from "./SessionDetail";

export const Sessions = () => {
  const sessions = useTimeframedDql(sessionsQuery());
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tableRef = useRef<DataTableRef>(null);

  // Deep-link: open the session named in ?session=
  const deepLink = params.get("session");
  const highlightKey = params.get("highlight") ?? undefined;
  useEffect(() => {
    if (deepLink) setSelectedId(deepLink);
  }, [deepLink]);

  const rows = (sessions.data?.records ?? []) as Array<Record<string, unknown>>;

  const columns = useMemo(
    () => [
      {
        id: "assistant",
        header: "Assistant",
        accessor: (r: Record<string, unknown>) => String(r.assistant ?? ""),
        cell: ({ value }: { value: string }) => (
          <Flex alignItems="center" gap={6} style={{ height: "100%", paddingLeft: 8 }}>
            {assistantBrandIcon(value, 14)}
            <span>{value}</span>
          </Flex>
        ),
        width: 140,
      },
      { id: "user", header: "User", accessor: (r: Record<string, unknown>) => String(r.user ?? "(unknown)"), width: "1fr" as const },
      { id: "dept", header: "Department", accessor: (r: Record<string, unknown>) => String(r.dept ?? ""), width: 160 },
      {
        id: "start",
        header: "Started",
        accessor: (r: Record<string, unknown>) => String(r.start ?? ""),
        cell: ({ value }: { value: string }) => <CenterCell>{fmtTime(value)}</CenterCell>,
        sortType: "datetime" as const,
        width: 150,
      },
      {
        id: "duration",
        header: "Duration",
        accessor: (r: Record<string, unknown>) => num(r.durationMs),
        cell: ({ value }: { value: number }) => <CenterCell>{fmtDuration(value)}</CenterCell>,
        sortType: "number" as const,
        width: 100,
      },
      { id: "interactions", header: "Turns", accessor: (r: Record<string, unknown>) => num(r.interactions), sortType: "number" as const, width: 80 },
      { id: "tools", header: "Tools", accessor: (r: Record<string, unknown>) => num(r.tools), sortType: "number" as const, width: 80 },
      {
        id: "tokens",
        header: "Tokens",
        accessor: (r: Record<string, unknown>) => num(r.tokens),
        cell: ({ value }: { value: number }) => <CenterCell>{fmtTokens(value)}</CenterCell>,
        sortType: "number" as const,
        width: 90,
      },
      {
        id: "cost",
        header: "Est. spend",
        accessor: (r: Record<string, unknown>) => num(r.cost),
        cell: ({ value }: { value: number }) => <CenterCell>{fmtUSD(value)}</CenterCell>,
        sortType: "number" as const,
        width: 100,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: Record<string, unknown>) => num(r.errors),
        cell: ({ rowData }: { rowData: Record<string, unknown> }) => {
          const errors = num(rowData.errors);
          const blocked = num(rowData.blocked);
          let content: React.ReactNode;
          if (errors > 0) content = <Text style={{ color: toneColor("critical"), fontSize: 12 }}>{errors} error{errors > 1 ? "s" : ""}</Text>;
          else if (blocked > 0) content = <Text style={{ color: subduedText, fontSize: 12 }}>{blocked} approvals</Text>;
          else content = <CheckmarkIcon size={14} style={{ color: toneColor("primary") }} />;
          return <CenterCell>{content}</CenterCell>;
        },
        sortType: "number" as const,
        width: 110,
      },
    ],
    [],
  );

  const close = () => {
    setSelectedId(null);
    if (params.get("session")) {
      params.delete("session");
      setParams(params, { replace: true });
    }
  };

  return (
    <Flex flexDirection="column" gap={16} padding={24} style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Flex flexDirection="column" gap={2}>
        <Heading level={2} style={{ margin: 0 }}>Sessions</Heading>
        <Text style={{ color: subduedText }}>Every coding session. Click a row to inspect its span tree.</Text>
      </Flex>

      <Section title={`${rows.length} session${rows.length === 1 ? "" : "s"}`} bare>
        <QueryState result={sessions} minHeight={200}>
          {() => (
            <DataTable
              ref={tableRef}
              data={rows}
              columns={columns as never}
              sortable
              fullWidth
              rowId={(r: Record<string, unknown>) => String(r.sessionId)}
              interactiveRows
              onActiveRowChange={(id) => setSelectedId(id)}
            />
          )}
        </QueryState>
      </Section>

      {selectedId && (
        <SessionDetail
          sessionId={selectedId}
          show={!!selectedId}
          onDismiss={close}
          highlightKey={highlightKey}
          {...navFor(selectedId)}
        />
      )}
    </Flex>
  );

  function navFor(id: string) {
    // Use the table's current display order (respects the active sort) so the
    // position and prev/next match what the user sees; fall back to data order.
    const ids = tableRef.current?.getDisplayedRowIds?.() ?? rows.map((r) => String(r.sessionId));
    const idx = ids.indexOf(id);
    if (idx < 0) return {};
    return {
      positionLabel: `${idx + 1} of ${ids.length}`,
      onPrev: idx > 0 ? () => setSelectedId(ids[idx - 1]) : undefined,
      onNext: idx < ids.length - 1 ? () => setSelectedId(ids[idx + 1]) : undefined,
      prefetchIds: [ids[idx - 1], ids[idx + 1]],
    };
  }
};
