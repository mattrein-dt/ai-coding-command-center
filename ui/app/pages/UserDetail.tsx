// Right-side Sheet with a single user's detail: KPI tiles, spend trend, model
// mix, tool mix, and recent sessions. Mounted only while a user is selected, so
// its queries run on open and are torn down on close.

import React from "react";
import { Sheet } from "@dynatrace/strato-components/overlays";
import { Button } from "@dynatrace/strato-components/buttons";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { TimeseriesChart, convertToTimeseries, DonutChart } from "@dynatrace/strato-components/charts";
import { Link } from "react-router-dom";

import { StatTile } from "../components/StatTile";
import { Section } from "../components/Section";
import { QueryState } from "../components/QueryState";
import { subduedText, surfaceStyle } from "../components/tokens";
import { useTimeframedDql, num } from "../data/useQuery";
import { fmtInt, fmtTokens, fmtUSD, fmtTime } from "../data/normalize";
import { sessionsQuery, userSpendTsQuery, userModelMixQuery, userToolMixQuery } from "../data/queries";

function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface UserDetailProps {
  uid: string;
  userName: string;
  show: boolean;
  onDismiss: () => void;
}

export function UserDetail({ uid, userName, show, onDismiss }: UserDetailProps) {
  const sessions = useTimeframedDql(sessionsQuery(`uid == "${esc(uid)}"`));
  const spend = useTimeframedDql(userSpendTsQuery(uid));
  const models = useTimeframedDql(userModelMixQuery(uid));
  const tools = useTimeframedDql(userToolMixQuery(uid));

  const sessRows = (sessions.data?.records ?? []) as Array<Record<string, unknown>>;
  const totals = sessRows.reduce<{ sessions: number; llm: number; tokens: number; cost: number }>(
    (acc, s) => {
      acc.sessions += 1;
      acc.llm += num(s.llm);
      acc.tokens += num(s.inTok) + num(s.outTok) + num(s.crTok);
      acc.cost += num(s.cost);
      return acc;
    },
    { sessions: 0, llm: 0, tokens: 0, cost: 0 },
  );
  const dept = sessRows.length ? String(sessRows[0].dept) : "";

  return (
    <Sheet show={show} onDismiss={onDismiss} title={userName || uid} actions={<Button onClick={onDismiss}>Close</Button>}>
      <Flex flexDirection="column" gap={16} style={{ width: 520, maxWidth: "100%", paddingBottom: 24 }}>
        <Text style={{ color: subduedText }}>{dept}{uid !== userName ? ` · ${uid}` : ""}</Text>

        <Flex gap={12} flexFlow="wrap">
          <StatTile label="Sessions" value={fmtInt(totals.sessions)} />
          <StatTile label="Requests" value={fmtInt(totals.llm)} />
          <StatTile label="Tokens" value={fmtTokens(totals.tokens)} />
          <StatTile label="Est. spend" value={fmtUSD(totals.cost)} tone="primary" />
        </Flex>

        <Section title="Spend over time">
          <QueryState result={spend} minHeight={180}>
            {() => (
              <div style={{ height: 200, display: "flex", minHeight: 0 }}>
                <TimeseriesChart
                  data={convertToTimeseries(
                    spend.data!.records as never,
                    (spend.data as { types?: unknown }).types as never,
                  )}
                  variant="line"
                  gapPolicy="connect"
                  style={{ flex: 1, minHeight: 0, height: "100%" }}
                />
              </div>
            )}
          </QueryState>
        </Section>

        <Flex gap={16} flexFlow="wrap">
          <Section title="Model mix" style={{ flex: "1 1 220px" }}>
            <QueryState result={models} minHeight={180}>
              {(records) => {
                const data = records.map((r) => ({ model: String(r.model), chats: num(r.chats) }));
                return (
                  <div style={{ height: 200, display: "flex", minHeight: 0 }}>
                    <DonutChart data={data} labelAccessor="model" valueAccessor="chats" style={{ flex: 1, minHeight: 0, height: "100%" }} />
                  </div>
                );
              }}
            </QueryState>
          </Section>
          <Section title="Top tools" style={{ flex: "1 1 220px" }}>
            <QueryState result={tools} minHeight={180}>
              {(records) => <ToolBars rows={records} />}
            </QueryState>
          </Section>
        </Flex>

        <Section title="Recent sessions">
          <QueryState result={sessions} minHeight={80}>
            {(records) => (
              <Flex flexDirection="column" gap={2}>
                {records.slice(0, 12).map((s) => (
                  <Link
                    key={String(s.sessionId)}
                    to={`/sessions?session=${encodeURIComponent(String(s.sessionId))}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Flex justifyContent="space-between" gap={8} padding={6} style={{ borderRadius: 4 }}>
                      <Text style={{ fontFamily: "monospace", fontSize: 12 }}>{String(s.sessionId).slice(0, 8)}</Text>
                      <Text style={{ color: subduedText, fontSize: 12 }}>{fmtTime(String(s.start))}</Text>
                      <Text style={{ fontSize: 12 }}>{fmtInt(num(s.llm))} req</Text>
                      <Text style={{ fontSize: 12, minWidth: 60, textAlign: "right" }}>{fmtUSD(num(s.cost))}</Text>
                    </Flex>
                  </Link>
                ))}
              </Flex>
            )}
          </QueryState>
        </Section>
      </Flex>
    </Sheet>
  );
}

function ToolBars({ rows }: { rows: Array<Record<string, unknown>> }) {
  const data = rows.map((r) => ({ tool: String(r.toolNm), calls: num(r.calls) }));
  const max = Math.max(1, ...data.map((d) => d.calls));
  return (
    <Flex flexDirection="column" gap={6}>
      {data.map((d) => (
        <Flex key={d.tool} alignItems="center" gap={8}>
          <Text style={{ fontSize: 12, minWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.tool}</Text>
          <div style={{ flex: 1, height: 8, borderRadius: 4, ...surfaceStyle, boxShadow: "none", overflow: "hidden" }}>
            <div style={{ width: `${(d.calls / max) * 100}%`, height: "100%", background: "var(--dt-colors-background-accent-primary-default, #464cce)" }} />
          </div>
          <Text style={{ fontSize: 12, minWidth: 32, textAlign: "right" }}>{d.calls}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
