// Overview / landing tab: engineering-health KPIs, a productivity-led
// "needs attention" list, spend trends, and a compact security strip.

import React from "react";
import { Link } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { TimeseriesChart, convertToTimeseries } from "@dynatrace/strato-components/charts";
import { DonutChart } from "@dynatrace/strato-components/charts";
import {
  ChatIcon,
  ClockIcon,
  CriticalIcon,
  DatabaseIcon,
  GhostIcon,
  GroupIcon,
  ListIcon,
  LockIcon,
  MoneyIcon,
  PauseIcon,
  TerminalIcon,
} from "@dynatrace/strato-icons";

import { StatTile } from "../components/StatTile";
import { Section } from "../components/Section";
import { QueryState } from "../components/QueryState";
import { toneColor, subduedText } from "../components/tokens";
import type { IconType, Tone } from "../data/taskKind";
import { useTimeframedDql, num } from "../data/useQuery";
import { fmtInt, fmtTokens, fmtUSD, fmtDuration } from "../data/normalize";
import {
  overviewKpisQuery,
  spendTimeseriesQuery,
  modelSpendQuery,
  sessionsQuery,
  securityByDeptQuery,
} from "../data/queries";

export const Overview = () => {
  const kpis = useTimeframedDql(overviewKpisQuery());
  const spendTs = useTimeframedDql(spendTimeseriesQuery());
  const modelSpend = useTimeframedDql(modelSpendQuery());
  const sessions = useTimeframedDql(sessionsQuery());
  const security = useTimeframedDql(securityByDeptQuery());

  return (
    <Flex flexDirection="column" gap={20} padding={24} style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Flex flexDirection="column" gap={2}>
        <Heading level={2} style={{ margin: 0 }}>AI Coding Command Center</Heading>
        <Text style={{ color: subduedText }}>
          Engineering coding sessions across Claude Code and GitHub Copilot.
        </Text>
      </Flex>

      {/* KPI row */}
      <QueryState result={kpis} minHeight={90}>
        {(records) => {
          const k = records[0] ?? {};
          const tokens = num(k.inTok) + num(k.outTok) + num(k.crTok) + num(k.ccTok);
          return (
            <Flex gap={12} flexFlow="wrap">
              <StatTile label="Active users" value={fmtInt(num(k.users))} Icon={GroupIcon} />
              <StatTile label="Sessions" value={fmtInt(num(k.sessions))} Icon={ListIcon} />
              <StatTile label="LLM requests" value={fmtInt(num(k.chats))} Icon={ChatIcon} />
              <StatTile label="Total tokens" value={fmtTokens(tokens)} Icon={DatabaseIcon} />
              <StatTile label="Est. spend" value={fmtUSD(num(k.cost))} tone="primary" Icon={MoneyIcon} />
              <StatTile label="Cache savings" value={fmtUSD(num(k.savings))} tone="primary" hint="vs. uncached" Icon={DatabaseIcon} />
              <StatTile label="Avg interaction" value={fmtDuration(num(k.avgInteractionMs))} Icon={ClockIcon} />
            </Flex>
          );
        }}
      </QueryState>

      {/* Needs attention */}
      <Section title="Needs attention" subtitle="Sessions worth a look, most urgent first.">
        <QueryState result={sessions} minHeight={80} empty={<Text>Nothing needs attention. 🎉</Text>}>
          {(records) => <AttentionList sessions={records} />}
        </QueryState>
      </Section>

      {/* Trends */}
      <Flex gap={16} flexFlow="wrap">
        <Section title="Spend over time" subtitle="Estimated cost by assistant." style={{ flex: "2 1 420px" }}>
          <QueryState result={spendTs} minHeight={220}>
            {() => (
              <div style={{ height: 240 }}>
                <TimeseriesChart
                  data={convertToTimeseries(
                    spendTs.data!.records as never,
                    (spendTs.data as { types?: unknown }).types as never,
                  )}
                  variant="line"
                  gapPolicy="connect"
                />
              </div>
            )}
          </QueryState>
        </Section>
        <Section title="Spend by model" style={{ flex: "1 1 280px" }}>
          <QueryState result={modelSpend} minHeight={220}>
            {(records) => {
              const data = records
                .map((r) => ({ model: String(r.model), spend: num(r.spend) }))
                .filter((r) => r.spend > 0);
              if (data.length === 0) return <Text style={{ color: subduedText }}>No priced spend.</Text>;
              return (
                <div style={{ height: 240 }}>
                  <DonutChart data={data} labelAccessor="model" valueAccessor="spend" />
                </div>
              );
            }}
          </QueryState>
        </Section>
      </Flex>

      {/* Security strip */}
      <Section title="Security & governance" subtitle="Signals from prompts and terminal commands.">
        <QueryState result={security} minHeight={90}>
          {(records) => <SecurityStrip rows={records} />}
        </QueryState>
      </Section>
    </Flex>
  );
};

// ---------------------------------------------------------------------------

interface AttentionItem {
  sessionId: string;
  user: string;
  dept: string;
  label: string;
  detail: string;
  tone: Tone;
  Icon: IconType;
  severity: number;
}

function buildAttention(sessions: Array<Record<string, unknown>>): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const s of sessions) {
    const sessionId = String(s.sessionId ?? "");
    const user = String(s.user ?? "(unknown)");
    const dept = String(s.dept ?? "");
    const errors = num(s.errors);
    const cost = num(s.cost);
    const blocked = num(s.blocked);
    const durMs = new Date(String(s.end)).getTime() - new Date(String(s.start)).getTime();
    const durMin = durMs / 60000;

    // one row per session, most severe reason wins
    if (errors > 0) {
      items.push({ sessionId, user, dept, label: "Failed LLM requests", detail: `${errors} error${errors > 1 ? "s" : ""}`, tone: "critical", Icon: CriticalIcon, severity: 100 + errors });
    } else if (cost >= 15) {
      items.push({ sessionId, user, dept, label: "High spend", detail: fmtUSD(cost), tone: "warning", Icon: MoneyIcon, severity: 80 + cost });
    } else if (durMin >= 45) {
      items.push({ sessionId, user, dept, label: "Long-running session", detail: fmtDuration(durMs), tone: "warning", Icon: ClockIcon, severity: 60 + durMin / 10 });
    } else if (blocked >= 40) {
      items.push({ sessionId, user, dept, label: "Heavy approval friction", detail: `${blocked} approvals`, tone: "neutral", Icon: PauseIcon, severity: 40 + blocked / 10 });
    }
  }
  return items.sort((a, b) => b.severity - a.severity).slice(0, 10);
}

function AttentionList({ sessions }: { sessions: Array<Record<string, unknown>> }) {
  const items = buildAttention(sessions);
  if (items.length === 0) return <Text style={{ color: subduedText }}>Nothing needs attention right now. 🎉</Text>;
  return (
    <Flex flexDirection="column" gap={2}>
      {items.map((it, i) => (
        <Link
          key={`${it.sessionId}-${i}`}
          to={`/sessions?session=${encodeURIComponent(it.sessionId)}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Flex
            alignItems="center"
            gap={12}
            padding={8}
            style={{ borderRadius: 4, cursor: "pointer" }}
          >
            <span style={{ color: toneColor(it.tone), display: "flex" }}><it.Icon /></span>
            <Text style={{ fontWeight: 600, minWidth: 180, color: toneColor(it.tone) }}>{it.label}</Text>
            <Text style={{ minWidth: 90 }}>{it.detail}</Text>
            <Text style={{ color: subduedText, flex: 1 }}>
              {it.user}{it.dept ? ` · ${it.dept}` : ""}
            </Text>
            <Text style={{ color: subduedText, fontFamily: "monospace", fontSize: 12 }}>
              {it.sessionId.slice(0, 8)}
            </Text>
          </Flex>
        </Link>
      ))}
    </Flex>
  );
}

// ---------------------------------------------------------------------------

const SEC_DEFS: Array<{ key: string; label: string; Icon: IconType; tone: Tone }> = [
  { key: "secrets", label: "Leaked secrets", Icon: LockIcon, tone: "critical" },
  { key: "destructive", label: "Destructive commands", Icon: TerminalIcon, tone: "critical" },
  { key: "credential", label: "Credential access", Icon: LockIcon, tone: "warning" },
  { key: "jailbreak", label: "Jailbreak attempts", Icon: GhostIcon, tone: "warning" },
  { key: "shadow", label: "Shadow-AI calls", Icon: GhostIcon, tone: "warning" },
];

function SecurityStrip({ rows }: { rows: Array<Record<string, unknown>> }) {
  const totals: Record<string, number> = {};
  for (const d of SEC_DEFS) totals[d.key] = rows.reduce((acc, r) => acc + num(r[d.key]), 0);
  const worst = [...rows].sort((a, b) => num(b.total) - num(a.total)).filter((r) => num(r.total) > 0);

  return (
    <Flex flexDirection="column" gap={12}>
      <Flex gap={12} flexFlow="wrap">
        {SEC_DEFS.map((d) => (
          <StatTile
            key={d.key}
            label={d.label}
            value={fmtInt(totals[d.key])}
            Icon={d.Icon}
            tone={totals[d.key] > 0 ? d.tone : "neutral"}
          />
        ))}
      </Flex>
      {worst.length > 0 && (
        <Text style={{ color: subduedText, fontSize: 12 }}>
          Flagged departments:{" "}
          {worst.map((r, i) => (
            <span key={String(r.dept)}>
              {i > 0 ? " · " : ""}
              <strong>{String(r.dept)}</strong> ({fmtInt(num(r.total))})
            </span>
          ))}
        </Text>
      )}
    </Flex>
  );
}
