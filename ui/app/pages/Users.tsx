// Users tab: a per-user table (sortable, filterable by department) with a
// department rollup strip. Clicking a user opens a right-side Sheet with detail.

import React, { useMemo, useState } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import { Select, SelectOption } from "@dynatrace/strato-components/forms";

import { StatTile } from "../components/StatTile";
import { Section } from "../components/Section";
import { QueryState } from "../components/QueryState";
import { subduedText } from "../components/tokens";
import { useTimeframedDql, num } from "../data/useQuery";
import { fmtInt, fmtTokens, fmtUSD, fmtTime } from "../data/normalize";
import { usersQuery, departmentsQuery } from "../data/queries";
import { assistantBrandIcon, AnthropicIcon, CopilotIcon } from "../components/brandIcons";
import { CenterCell } from "../components/CenterCell";
import { UserDetail } from "./UserDetail";

export const Users = () => {
  const users = useTimeframedDql(usersQuery());
  const depts = useTimeframedDql(departmentsQuery());
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");

  const allRows = (users.data?.records ?? []) as Array<Record<string, unknown>>;
  const rows = useMemo(
    () => (deptFilter === "all" ? allRows : allRows.filter((r) => String(r.dept) === deptFilter)),
    [allRows, deptFilter],
  );

  const deptRows = (depts.data?.records ?? []) as Array<Record<string, unknown>>;
  const deptOptions = useMemo(() => Array.from(new Set(deptRows.map((d) => String(d.dept)))).sort(), [deptRows]);

  const columns = useMemo(
    () => [
      { id: "user", header: "User", accessor: (r: Record<string, unknown>) => String(r.user ?? "(unknown)"), width: "1fr" as const },
      { id: "dept", header: "Department", accessor: (r: Record<string, unknown>) => String(r.dept ?? ""), width: 170 },
      {
        id: "assistant",
        header: "Assistant",
        accessor: (r: Record<string, unknown>) => String(r.assistantKind ?? "—"),
        cell: ({ value }: { value: string }) => (
          <Flex alignItems="center" gap={6} style={{ height: "100%", paddingLeft: 8 }}>
            {value === "Both" ? (
              <>
                <AnthropicIcon size={14} />
                <CopilotIcon size={14} />
              </>
            ) : value === "—" ? null : (
              assistantBrandIcon(value, 14)
            )}
            <span>{value}</span>
          </Flex>
        ),
        width: 140,
      },
      { id: "sessions", header: "Sessions", accessor: (r: Record<string, unknown>) => num(r.sessions), sortType: "number" as const, width: 100 },
      { id: "llm", header: "Requests", accessor: (r: Record<string, unknown>) => num(r.llm), sortType: "number" as const, width: 100 },
      {
        id: "tokens",
        header: "Tokens",
        accessor: (r: Record<string, unknown>) => num(r.tokens),
        cell: ({ value }: { value: number }) => <CenterCell>{fmtTokens(value)}</CenterCell>,
        sortType: "number" as const,
        width: 100,
      },
      {
        id: "cost",
        header: "Est. spend",
        accessor: (r: Record<string, unknown>) => num(r.cost),
        cell: ({ value }: { value: number }) => <CenterCell>{fmtUSD(value)}</CenterCell>,
        sortType: "number" as const,
        width: 110,
      },
      {
        id: "lastActive",
        header: "Last active",
        accessor: (r: Record<string, unknown>) => String(r.lastActive ?? ""),
        cell: ({ value }: { value: string }) => <CenterCell>{fmtTime(value)}</CenterCell>,
        sortType: "datetime" as const,
        width: 150,
      },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" gap={20} padding={24} style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Flex justifyContent="space-between" alignItems="flex-end" gap={12} flexFlow="wrap">
        <Flex flexDirection="column" gap={2}>
          <Heading level={2} style={{ margin: 0 }}>Users</Heading>
          <Text style={{ color: subduedText }}>Coding activity by engineer. Click a row for detail.</Text>
        </Flex>
        <Select name="dept" value={deptFilter} onChange={(v) => setDeptFilter((v as string) ?? "all")} style={{ minWidth: 200 }}>
          <SelectOption value="all">All departments</SelectOption>
          {deptOptions.map((d) => (
            <SelectOption key={d} value={d}>{d}</SelectOption>
          ))}
        </Select>
      </Flex>

      {/* Department rollup */}
      <QueryState result={depts} minHeight={80}>
        {(records) => (
          <Flex gap={12} flexFlow="wrap">
            {records.map((d) => (
              <StatTile
                key={String(d.dept)}
                label={String(d.dept)}
                value={fmtUSD(num(d.cost))}
                hint={`${fmtInt(num(d.users))} users · ${fmtInt(num(d.sessions))} sessions`}
                onClick={() => setDeptFilter(String(d.dept))}
              />
            ))}
          </Flex>
        )}
      </QueryState>

      <Section title={`${rows.length} user${rows.length === 1 ? "" : "s"}`} bare>
        <QueryState result={users} minHeight={200}>
          {() => (
            <DataTable
              data={rows}
              columns={columns as never}
              sortable
              fullWidth
              rowId={(r: Record<string, unknown>) => String(r.uid)}
              interactiveRows
              onActiveRowChange={(uid) => {
                if (uid) {
                  const row = rows.find((r) => String(r.uid) === uid);
                  setSelectedUser(row ? String(row.user) : uid);
                }
                setSelectedUid(uid);
              }}
            />
          )}
        </QueryState>
      </Section>

      {selectedUid && (
        <UserDetail
          uid={selectedUid}
          userName={selectedUser}
          show={!!selectedUid}
          onDismiss={() => setSelectedUid(null)}
        />
      )}
    </Flex>
  );
};
