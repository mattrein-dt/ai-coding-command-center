// Overview / landing tab: engineering-health KPIs, a productivity-led
// "needs attention" list, spend trends, and a compact security strip.

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { TimeseriesChart, convertToTimeseries } from "@dynatrace/strato-components/charts";
import { DonutChart } from "@dynatrace/strato-components/charts";
import { Sheet } from "@dynatrace/strato-components/overlays";
import { Button } from "@dynatrace/strato-components/buttons";
import {
  ChatIcon,
  ClockIcon,
  CriticalIcon,
  DatabaseIcon,
  DocumentIcon,
  GhostIcon,
  GroupIcon,
  ListIcon,
  LockIcon,
  MoneyIcon,
  PauseIcon,
  RefreshIcon,
  TerminalIcon,
  WarningIcon,
  WorldmapIcon,
} from "@dynatrace/strato-icons";

import { ProgressCircle } from "@dynatrace/strato-components/content";

import { StatTile } from "../components/StatTile";
import { Section } from "../components/Section";
import { QueryState, type DqlResultLike } from "../components/QueryState";
import { toneColor, subduedText, surfaceStyle } from "../components/tokens";
import type { IconType, Tone } from "../data/taskKind";
import { useTimeframedDql, num } from "../data/useQuery";
import { fmtInt, fmtTokens, fmtUSD, fmtDuration, fmtTime } from "../data/normalize";
import {
  overviewKpisQuery,
  spendTimeseriesQuery,
  modelSpendQuery,
  attentionQuery,
  securityByDeptQuery,
  securityFlagDetailQuery,
  repeatedFetchesQuery,
  repeatedCommandsQuery,
  repeatedReadsQuery,
  toolHealthQuery,
  toolFailureDetailQuery,
  llmRetryQuery,
  llmRetryDetailQuery,
} from "../data/queries";

export const Overview = () => {
  const navigate = useNavigate();
  const kpis = useTimeframedDql(overviewKpisQuery());
  const spendTs = useTimeframedDql(spendTimeseriesQuery());
  const modelSpend = useTimeframedDql(modelSpendQuery());
  const attention = useTimeframedDql(attentionQuery());
  const security = useTimeframedDql(securityByDeptQuery());
  const fetches = useTimeframedDql(repeatedFetchesQuery());
  const commands = useTimeframedDql(repeatedCommandsQuery());
  const reads = useTimeframedDql(repeatedReadsQuery());
  const toolHealth = useTimeframedDql(toolHealthQuery());
  const toolFailureDetail = useTimeframedDql(toolFailureDetailQuery());
  const llmRetry = useTimeframedDql(llmRetryQuery());
  const llmRetryDetail = useTimeframedDql(llmRetryDetailQuery());

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
              <StatTile label="Active users" value={fmtInt(num(k.users))} Icon={GroupIcon} onClick={() => navigate("/users")} />
              <StatTile label="Sessions" value={fmtInt(num(k.sessions))} Icon={ListIcon} onClick={() => navigate("/sessions")} />
              <StatTile label="LLM requests" value={fmtInt(num(k.chats))} Icon={ChatIcon} onClick={() => navigate("/sessions")} />
              <StatTile label="Total tokens" value={fmtTokens(tokens)} Icon={DatabaseIcon} onClick={() => navigate("/sessions")} />
              <StatTile label="Est. spend" value={fmtUSD(num(k.cost))} tone="primary" Icon={MoneyIcon} onClick={() => navigate("/sessions")} />
              <StatTile label="Cache savings" value={fmtUSD(num(k.savings))} tone="primary" hint="vs. uncached" Icon={DatabaseIcon} onClick={() => navigate("/sessions")} />
              <StatTile label="Avg interaction" value={fmtDuration(num(k.avgInteractionMs))} Icon={ClockIcon} onClick={() => navigate("/sessions")} />
            </Flex>
          );
        }}
      </QueryState>

      {/* Needs attention */}
      <Section title="Needs attention" subtitle="Sessions worth a look, most urgent first.">
        <QueryState result={attention} minHeight={80} empty={<Text>Nothing needs attention. 🎉</Text>}>
          {(records) => <AttentionList sessions={records} />}
        </QueryState>
      </Section>

      {/* Optimization recommendations */}
      <Section title="Optimization recommendations" subtitle="Deterministic inefficiencies worth addressing — repeated work that could be cached, scripted, or avoided.">
        <OptimizationRecs
          fetches={fetches}
          commands={commands}
          reads={reads}
          toolHealth={toolHealth}
          toolFailureDetail={toolFailureDetail}
          llmRetry={llmRetry}
          llmRetryDetail={llmRetryDetail}
        />
      </Section>

      {/* Trends */}
      <Flex gap={16} flexFlow="wrap">
        <Section title="Spend over time" subtitle="Estimated cost by assistant." style={{ flex: "2 1 420px" }}>
          <QueryState result={spendTs} minHeight={220}>
            {() => (
              <div style={{ height: 240, display: "flex", minHeight: 0 }}>
                <TimeseriesChart
                  data={convertToTimeseries(
                    spendTs.data!.records as never,
                    (spendTs.data as { types?: unknown }).types as never,
                  )}
                  variant="line"
                  gapPolicy="connect"
                  style={{ flex: 1, minHeight: 0, height: "100%" }}
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
                <div style={{ height: 240, display: "flex", minHeight: 0 }}>
                  <DonutChart data={data} labelAccessor="model" valueAccessor="spend" style={{ flex: 1, minHeight: 0, height: "100%" }} />
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

const ATTN_DEFS: Record<string, { label: (errors: number) => string; detail: (r: Record<string, unknown>) => string; tone: Tone; Icon: IconType }> = {
  errors: {
    label: () => "Failed LLM requests",
    detail: (r) => { const errors = num(r.errors); return `${errors} error${errors > 1 ? "s" : ""}`; },
    tone: "critical",
    Icon: CriticalIcon,
  },
  cost: {
    label: () => "High spend",
    detail: (r) => fmtUSD(num(r.cost)),
    tone: "warning",
    Icon: MoneyIcon,
  },
  duration: {
    label: () => "Long-running session",
    detail: (r) => fmtDuration(num(r.durationMs)),
    tone: "warning",
    Icon: ClockIcon,
  },
  blocked: {
    label: () => "Heavy approval friction",
    detail: (r) => `${num(r.blocked)} approvals`,
    tone: "neutral",
    Icon: PauseIcon,
  },
};

function AttentionList({ sessions }: { sessions: Array<Record<string, unknown>> }) {
  if (sessions.length === 0) return <Text style={{ color: subduedText }}>Nothing needs attention right now. 🎉</Text>;
  return (
    <Flex flexDirection="column" gap={2}>
      {sessions.map((r, i) => {
        const sessionId = String(r.sessionId);
        const user = String(r.user);
        const dept = String(r.dept);
        const kind = String(r.attnKind);
        const def = ATTN_DEFS[kind];
        const label = def.label(num(r.errors));
        const detail = def.detail(r);
        return (
          <Link
            key={`${sessionId}-${i}`}
            to={`/sessions?session=${encodeURIComponent(sessionId)}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Flex
              alignItems="center"
              gap={12}
              padding={8}
              style={{ borderRadius: 4, cursor: "pointer" }}
            >
              <span style={{ color: toneColor(def.tone), display: "flex" }}><def.Icon /></span>
              <Text style={{ fontWeight: 600, minWidth: 180, color: toneColor(def.tone) }}>{label}</Text>
              <Text style={{ minWidth: 90 }}>{detail}</Text>
              <Text style={{ color: subduedText, flex: 1 }}>
                {user}{dept ? ` · ${dept}` : ""}
              </Text>
              <Text style={{ color: subduedText, fontFamily: "monospace", fontSize: 12 }}>
                {sessionId.slice(0, 8)}
              </Text>
            </Flex>
          </Link>
        );
      })}
    </Flex>
  );
}

// ---------------------------------------------------------------------------

const SEC_DEFS: Array<{ key: "secrets" | "destructive" | "credential" | "jailbreak" | "shadow"; label: string; Icon: IconType; tone: Tone }> = [
  { key: "secrets", label: "Leaked secrets", Icon: LockIcon, tone: "critical" },
  { key: "destructive", label: "Destructive commands", Icon: TerminalIcon, tone: "critical" },
  { key: "credential", label: "Credential access", Icon: LockIcon, tone: "warning" },
  { key: "jailbreak", label: "Jailbreak attempts", Icon: GhostIcon, tone: "warning" },
  { key: "shadow", label: "Shadow-AI calls", Icon: GhostIcon, tone: "warning" },
];

type SecFlagKey = "secrets" | "destructive" | "credential" | "jailbreak" | "shadow";

function SecurityStrip({ rows }: { rows: Array<Record<string, unknown>> }) {
  const [openFlag, setOpenFlag] = useState<SecFlagKey | null>(null);
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
            onClick={() => setOpenFlag(d.key)}
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
      {openFlag && (
        <SecurityDetailSheet
          flagKey={openFlag}
          flagDef={SEC_DEFS.find((d) => d.key === openFlag)!}
          onDismiss={() => setOpenFlag(null)}
        />
      )}
    </Flex>
  );
}

const SEC_CONTEXT_LABELS: Record<SecFlagKey, string> = {
  secrets: "Detection",
  destructive: "Command",
  credential: "Command",
  jailbreak: "Prompt excerpt",
  shadow: "Personal account",
};

function SecurityDetailSheet({
  flagKey,
  flagDef,
  onDismiss,
}: {
  flagKey: SecFlagKey;
  flagDef: { label: string; tone: Tone };
  onDismiss: () => void;
}) {
  const detail = useTimeframedDql(securityFlagDetailQuery(flagKey));
  const recs = (detail.data?.records ?? []) as Array<Record<string, unknown>>;
  const contextLabel = SEC_CONTEXT_LABELS[flagKey];

  return (
    <Sheet
      show
      onDismiss={onDismiss}
      title={flagDef.label}
      actions={<Button onClick={onDismiss}>Close</Button>}
      style={{ width: "70vw" }}
    >
      <Flex flexDirection="column" gap={4} style={{ paddingBottom: 24 }}>
        {detail.isLoading && recs.length === 0 ? (
          <Flex justifyContent="center" padding={32}><ProgressCircle aria-label="Loading" /></Flex>
        ) : recs.length === 0 ? (
          <Text style={{ color: subduedText }}>No events found in this timeframe.</Text>
        ) : (
          <Flex flexDirection="column" gap={0}>
            <Flex gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.1))" }}>
              <Text style={{ minWidth: 160, fontSize: 11, color: subduedText, fontWeight: 600 }}>USER</Text>
              <Text style={{ minWidth: 120, fontSize: 11, color: subduedText, fontWeight: 600 }}>DEPT</Text>
              <Text style={{ minWidth: 60, fontSize: 11, color: subduedText, fontWeight: 600, textAlign: "right" }}>HITS</Text>
              <Text style={{ flex: 1, fontSize: 11, color: subduedText, fontWeight: 600 }}>{contextLabel.toUpperCase()}</Text>
              <Text style={{ minWidth: 140, fontSize: 11, color: subduedText, fontWeight: 600, textAlign: "right" }}>LAST SEEN</Text>
            </Flex>
            {recs.map((r, i) => (
              <Link
                key={i}
                to={`/sessions?session=${encodeURIComponent(String(r.sessionId))}&highlight=${flagKey}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Flex gap={8} padding={8} alignItems="flex-start" style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.06))", cursor: "pointer" }}>
                  <Text style={{ minWidth: 160, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.uid)}</Text>
                  <Text style={{ minWidth: 120, fontSize: 12, color: subduedText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.dept)}</Text>
                  <Text style={{ minWidth: 60, fontSize: 12, color: toneColor(flagDef.tone), fontWeight: 600, textAlign: "right" }}>{fmtInt(num(r.hits))}</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: subduedText, wordBreak: "break-all" }}>{String(r.context ?? "")}</Text>
                  <Text style={{ minWidth: 140, fontSize: 11, color: subduedText, textAlign: "right", whiteSpace: "nowrap" }}>{fmtTime(String(r.lastSeen))}</Text>
                </Flex>
              </Link>
            ))}
          </Flex>
        )}
      </Flex>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Optimization recommendations
// ---------------------------------------------------------------------------

interface Offender {
  label: string;
  count: number;
  meta: string;
}
interface RecCard {
  key: string;
  Icon: IconType;
  tone: Tone;
  title: string;
  headline: string;
  sub: string;
  offenders: Offender[];
}

function rows(r: DqlResultLike): Array<Record<string, unknown>> {
  return (r.data?.records ?? []) as Array<Record<string, unknown>>;
}
function shortUrl(u: string): string {
  const s = u.replace(/^https?:\/\//, "");
  return s.length > 52 ? `${s.slice(0, 49)}…` : s;
}
function shortPath(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts.length <= 2 ? p : `…/${parts.slice(-2).join("/")}`;
}
function oneLine(c: string): string {
  const s = c.replace(/\s+/g, " ").trim();
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

/** Build a "repeated inputs" card from one of the union queries. */
function repeatCard(
  result: DqlResultLike,
  countKey: string,
  opts: { key: string; Icon: IconType; title: string; noun: string; label: (item: string) => string },
): RecCard | null {
  const recs = rows(result);
  if (recs.length === 0) return null;
  const redundant = recs.reduce((a, r) => a + Math.max(0, num(r[countKey]) - 1), 0);
  if (redundant === 0) return null;
  const offenders: Offender[] = recs.slice(0, 5).map((r) => ({
    label: opts.label(String(r.item)),
    count: num(r[countKey]),
    meta: `${fmtInt(num(r.sessions))} session${num(r.sessions) === 1 ? "" : "s"}`,
  }));
  return {
    key: opts.key,
    Icon: opts.Icon,
    tone: "warning",
    title: opts.title,
    headline: `${fmtInt(redundant)} redundant`,
    sub: `across ${fmtInt(recs.length)} ${opts.noun}${recs.length === 1 ? "" : "s"}`,
    offenders,
  };
}

function OptimizationRecs({
  fetches,
  commands,
  reads,
  toolHealth,
  toolFailureDetail,
  llmRetry,
  llmRetryDetail,
}: {
  fetches: DqlResultLike;
  commands: DqlResultLike;
  reads: DqlResultLike;
  toolHealth: DqlResultLike;
  toolFailureDetail: DqlResultLike;
  llmRetry: DqlResultLike;
  llmRetryDetail: DqlResultLike;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const all = [fetches, commands, reads, toolHealth, llmRetry];
  const anyLoading = all.some((r) => r.isLoading && (r.data?.records ?? []).length === 0);

  const cards: RecCard[] = [];
  const fetchCard = repeatCard(fetches, "fetches", {
    key: "fetches",
    Icon: WorldmapIcon,
    title: "Cache repeated web fetches",
    noun: "URL",
    label: (i) => shortUrl(i),
  });
  const cmdCard = repeatCard(commands, "runs", {
    key: "commands",
    Icon: TerminalIcon,
    title: "Script repeated commands",
    noun: "command",
    label: (i) => oneLine(i),
  });
  const readCard = repeatCard(reads, "reads", {
    key: "reads",
    Icon: DocumentIcon,
    title: "Reduce redundant file reads",
    noun: "file",
    label: (i) => shortPath(i),
  });
  if (fetchCard) cards.push(fetchCard);
  if (cmdCard) cards.push(cmdCard);
  if (readCard) cards.push(readCard);

  // Tool failure rate
  const th = rows(toolHealth)[0] ?? {};
  const failures = num(th.toolFailures);
  const total = num(th.toolTotal);
  if (failures > 0 && total > 0) {
    const rate = (failures / total) * 100;
    cards.push({
      key: "failures",
      Icon: WarningIcon,
      tone: rate >= 5 ? "critical" : "warning",
      title: "Investigate tool failures",
      headline: `${rate.toFixed(1)}%`,
      sub: `${fmtInt(failures)} of ${fmtInt(total)} tool runs failed`,
      offenders: [],
    });
  }

  // LLM retries
  const retries = num(rows(llmRetry)[0]?.retries);
  if (retries > 0) {
    cards.push({
      key: "retries",
      Icon: RefreshIcon,
      tone: "warning",
      title: "LLM request retries",
      headline: fmtInt(retries),
      sub: "requests needed more than one attempt",
      offenders: [],
    });
  }

  if (cards.length === 0) {
    if (anyLoading) {
      return (
        <Flex justifyContent="center" alignItems="center" style={{ minHeight: 100 }}>
          <ProgressCircle aria-label="Loading" />
        </Flex>
      );
    }
    return <Text style={{ color: subduedText }}>No significant inefficiencies detected in this timeframe. 🎉</Text>;
  }

  const openCard = cards.find((c) => c.key === openKey) ?? null;
  const detailData: Record<string, DqlResultLike> = {
    fetches,
    commands,
    reads,
    failures: toolFailureDetail,
    retries: llmRetryDetail,
  };
  const countKeys: Record<string, string> = { fetches: "fetches", commands: "runs", reads: "reads" };

  return (
    <>
      <Flex gap={12} flexFlow="wrap">
        {cards.map((c) => (
          <Flex
            key={c.key}
            flexDirection="column"
            gap={8}
            padding={16}
            style={{ ...surfaceStyle, flex: "1 1 300px", minWidth: 280, cursor: "pointer" }}
            onClick={() => setOpenKey(c.key)}
          >
            <Flex justifyContent="space-between" alignItems="flex-start" gap={8}>
              <Flex alignItems="center" gap={8}>
                <span style={{ color: toneColor(c.tone), display: "flex" }}><c.Icon /></span>
                <Text style={{ fontWeight: 600 }}>{c.title}</Text>
              </Flex>
            </Flex>
            <Flex alignItems="baseline" gap={6}>
              <Heading level={4} style={{ margin: 0, color: toneColor(c.tone) }}>{c.headline}</Heading>
              <Text style={{ fontSize: 12, color: subduedText }}>{c.sub}</Text>
            </Flex>
            {c.offenders.length > 0 && (
              <Flex flexDirection="column" gap={2}>
                {c.offenders.map((o, i) => (
                  <Flex key={i} alignItems="center" gap={8} style={{ fontSize: 12 }}>
                    <Text style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontFamily: "monospace" }}>
                      {o.label}
                    </Text>
                    <Text style={{ color: toneColor("warning"), fontSize: 12 }}>×{o.count}</Text>
                    <Text style={{ color: subduedText, fontSize: 11, minWidth: 70, textAlign: "right" }}>{o.meta}</Text>
                  </Flex>
                ))}
              </Flex>
            )}
          </Flex>
        ))}
      </Flex>

      {openCard && (
        <RecDetailSheet
          card={openCard}
          result={detailData[openCard.key]}
          countKey={countKeys[openCard.key]}
          onDismiss={() => setOpenKey(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail sheet for an optimization recommendation card
// ---------------------------------------------------------------------------

function RecDetailSheet({
  card,
  result,
  countKey,
  onDismiss,
}: {
  card: RecCard;
  result: DqlResultLike;
  countKey?: string;
  onDismiss: () => void;
}) {
  const recs = (result?.data?.records ?? []) as Array<Record<string, unknown>>;
  const isRepeated = !!countKey;

  return (
    <Sheet
      show
      onDismiss={onDismiss}
      title={card.title}
      actions={<Button onClick={onDismiss}>Close</Button>}
      style={{ width: "60vw" }}
    >
      <Flex flexDirection="column" gap={4} style={{ paddingBottom: 24 }}>
        <Flex alignItems="baseline" gap={8} style={{ marginBottom: 12 }}>
          <Heading level={3} style={{ margin: 0, color: toneColor(card.tone) }}>{card.headline}</Heading>
          <Text style={{ color: subduedText }}>{card.sub}</Text>
        </Flex>

        {result?.isLoading && recs.length === 0 ? (
          <Flex justifyContent="center" padding={32}><ProgressCircle aria-label="Loading" /></Flex>
        ) : recs.length === 0 ? (
          <Text style={{ color: subduedText }}>No detail data available.</Text>
        ) : isRepeated ? (
          /* Repeated items: fetches / commands / reads */
          <Flex flexDirection="column" gap={0}>
            <Flex gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.1))" }}>
              <Text style={{ flex: 1, fontSize: 11, color: subduedText, fontWeight: 600 }}>ITEM</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 60, textAlign: "right" }}>COUNT</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 70, textAlign: "right" }}>SESSIONS</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 60, textAlign: "right" }}>USERS</Text>
            </Flex>
            {recs.map((r, i) => (
              <Flex key={i} gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.06))" }}>
                <Text style={{ flex: 1, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{String(r.item)}</Text>
                <Text style={{ fontSize: 12, color: toneColor("warning"), minWidth: 60, textAlign: "right", fontWeight: 600 }}>×{fmtInt(num(r[countKey!]))}</Text>
                <Text style={{ fontSize: 12, color: subduedText, minWidth: 70, textAlign: "right" }}>{fmtInt(num(r.sessions))}</Text>
                <Text style={{ fontSize: 12, color: subduedText, minWidth: 60, textAlign: "right" }}>{fmtInt(num(r.users))}</Text>
              </Flex>
            ))}
          </Flex>
        ) : card.key === "failures" ? (
          /* Tool failures by tool */
          <Flex flexDirection="column" gap={0}>
            <Flex gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.1))" }}>
              <Text style={{ flex: 1, fontSize: 11, color: subduedText, fontWeight: 600 }}>TOOL</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 80, textAlign: "right" }}>FAILURES</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 60, textAlign: "right" }}>TOTAL</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 60, textAlign: "right" }}>RATE</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 70, textAlign: "right" }}>SESSIONS</Text>
            </Flex>
            {recs.map((r, i) => {
              const rate = num(r.rate);
              return (
                <Flex key={i} gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.06))" }}>
                  <Text style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}>{String(r.tool_name)}</Text>
                  <Text style={{ fontSize: 12, color: toneColor(rate >= 5 ? "critical" : "warning"), minWidth: 80, textAlign: "right", fontWeight: 600 }}>{fmtInt(num(r.failures))}</Text>
                  <Text style={{ fontSize: 12, color: subduedText, minWidth: 60, textAlign: "right" }}>{fmtInt(num(r.total))}</Text>
                  <Text style={{ fontSize: 12, color: toneColor(rate >= 5 ? "critical" : "warning"), minWidth: 60, textAlign: "right" }}>{rate.toFixed(1)}%</Text>
                  <Text style={{ fontSize: 12, color: subduedText, minWidth: 70, textAlign: "right" }}>{fmtInt(num(r.sessions))}</Text>
                </Flex>
              );
            })}
          </Flex>
        ) : (
          /* LLM retries by model */
          <Flex flexDirection="column" gap={0}>
            <Flex gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.1))" }}>
              <Text style={{ flex: 1, fontSize: 11, color: subduedText, fontWeight: 600 }}>MODEL</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 70, textAlign: "right" }}>RETRIES</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 70, textAlign: "right" }}>SESSIONS</Text>
              <Text style={{ fontSize: 11, color: subduedText, fontWeight: 600, minWidth: 60, textAlign: "right" }}>USERS</Text>
            </Flex>
            {recs.map((r, i) => (
              <Flex key={i} gap={8} padding={8} style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default, rgba(255,255,255,0.06))" }}>
                <Text style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}>{String(r.model)}</Text>
                <Text style={{ fontSize: 12, color: toneColor("warning"), minWidth: 70, textAlign: "right", fontWeight: 600 }}>{fmtInt(num(r.retries))}</Text>
                <Text style={{ fontSize: 12, color: subduedText, minWidth: 70, textAlign: "right" }}>{fmtInt(num(r.sessions))}</Text>
                <Text style={{ fontSize: 12, color: subduedText, minWidth: 60, textAlign: "right" }}>{fmtInt(num(r.users))}</Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Sheet>
  );
}
