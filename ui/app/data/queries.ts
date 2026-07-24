// DQL query builders. Every builder composes `base()` from normalize.ts so all
// tokens/cost/assistant/department fields are computed identically. Timeframe is
// NOT embedded here — it is supplied per-call by `useDql` via
// defaultTimeframeStart/defaultTimeframeEnd (see data/timeframe.tsx).

import { base } from "./normalize";

/** Escape a value interpolated into a DQL double-quoted string literal. */
function q(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Cache-read tokens would have cost the full "fresh input" rate had they not
// been cached; the delta is the realized cache saving.
const SAVINGS_EXPR = `if(contains(model,"opus"), toDouble(cr)*13.5/1000000,
    else: if(contains(model,"sonnet"), toDouble(cr)*2.7/1000000,
    else: if(contains(model,"gpt-4o-mini"), toDouble(cr)*0.075/1000000, else: 0.0)))`;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function overviewKpisQuery(): string {
  return `${base()}
| fieldsAdd savings = ${SAVINGS_EXPR}
| summarize {
    users = countDistinct(uid),
    sessions = countDistinct(\`session.id\`),
    chats = countIf(is_llm),
    interactions = countIf(is_interaction),
    tools = countIf(is_tool),
    blocked = countIf(is_blocked),
    errors = countIf(is_llm and success == false),
    inTok = sum(toLong(inp)), outTok = sum(toLong(outp)),
    crTok = sum(toLong(cr)), ccTok = sum(toLong(cc)),
    cost = sum(cost),
    savings = sum(savings),
    avgInteractionMs = avg(interaction.duration_ms)
  }`;
}

export function spendTimeseriesQuery(): string {
  return `${base()}
| filter is_llm == true
| makeTimeseries spend = sum(cost), by:{assistant}`;
}

export function modelSpendQuery(): string {
  return `${base()}
| filter is_llm == true and model != ""
| summarize spend = sum(cost), chats = count(), tokens = sum(toLong(inp) + toLong(outp)), by:{model}
| sort spend desc`;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** One row per session. `extraFilter` (a bare DQL predicate) scopes it, e.g. `uid == "x"`. */
export function sessionsQuery(extraFilter?: string): string {
  const flt = extraFilter ? `\n| filter ${extraFilter}` : "";
  return `${base()}${flt}
| summarize {
    assistant = takeFirst(assistant),
    user = takeFirst(coalesce(user.name, user.email, "(unknown)")),
    uid = takeFirst(uid),
    dept = takeFirst(dept),
    start = min(start_time), end = max(end_time),
    interactions = countIf(is_interaction),
    llm = countIf(is_llm),
    tools = countIf(is_tool),
    blocked = countIf(is_blocked),
    errors = countIf(is_llm and success == false),
    inTok = sum(toLong(inp)), outTok = sum(toLong(outp)),
    crTok = sum(toLong(cr)), ccTok = sum(toLong(cc)),
    cost = sum(cost)
  }, by:{\`session.id\`}
| fieldsRename sessionId = \`session.id\`
| sort start desc
| limit 1000`;
}

/** All spans in one session, flattened — the client rebuilds the tree from parent/id. */
export function sessionSpansQuery(sessionId: string): string {
  return `${base()}
| filter \`session.id\` == "${q(sessionId)}"
| fields
    spanId = span.id, parent = span.parent_id, name = span.name,
    tool = tool_name, cmd = full_command, args = gen_ai.tool.call.arguments,
    toolUseId = coalesce(tool_use_id, gen_ai.tool.call.id), model,
    inTok = toLong(inp), outTok = toLong(outp), crTok = toLong(cr), ccTok = toLong(cc), cost,
    ttft = ttft_ms, success, attempt,
    seq = interaction.sequence, prompt = user_prompt, promptLen = user_prompt_length,
    durMs = coalesce(duration_ms, interaction.duration_ms),
    start = start_time, end = end_time,
    assistant, genOp = gen_ai.operation.name, agent = gen_ai.agent.name,
    repo = github.copilot.git.repository, branch = github.copilot.git.branch
| sort start asc
| limit 5000`;
}

/**
 * Claude Code records the actual tool inputs (command, file path, WebFetch URL,
 * …) only in its `tool_result` log events — not on the spans. This fetches them
 * for one session, keyed by tool_use_id, so the span detail panel can show them.
 */
export function sessionToolInputsQuery(sessionId: string): string {
  return `fetch logs
| filter otel.scope.name == "com.anthropic.claude_code.events"
    and \`session.id\` == "${q(sessionId)}"
    and event.name == "tool_result"
    and isNotNull(tool_input)
| fields toolUseId = tool_use_id, toolInput = tool_input, tool = tool_name,
    success = success, durMs = duration_ms
| limit 5000`;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function usersQuery(): string {
  return `${base()}
| summarize {
    user = takeFirst(coalesce(user.name, user.email, "(unknown)")),
    email = takeFirst(user.email),
    dept = takeFirst(dept),
    claudeChats = countIf(assistant == "Claude Code" and is_llm),
    copilotChats = countIf(assistant == "GitHub Copilot" and is_llm),
    sessions = countDistinct(\`session.id\`),
    interactions = countIf(is_interaction),
    llm = countIf(is_llm),
    tools = countIf(is_tool),
    inTok = sum(toLong(inp)), outTok = sum(toLong(outp)), crTok = sum(toLong(cr)),
    cost = sum(cost),
    lastActive = max(start_time)
  }, by:{uid}
| sort cost desc
| limit 500`;
}

/** Per-department rollup for the Users tab header / grouping. */
export function departmentsQuery(): string {
  return `${base()}
| summarize {
    users = countDistinct(uid),
    sessions = countDistinct(\`session.id\`),
    chats = countIf(is_llm),
    cost = sum(cost)
  }, by:{dept}
| sort cost desc`;
}

// ----- user detail (used inside the Sheet; scoped by uid) -----

export function userSpendTsQuery(uid: string): string {
  return `${base()}
| filter uid == "${q(uid)}" and is_llm == true
| makeTimeseries spend = sum(cost), by:{assistant}`;
}

export function userModelMixQuery(uid: string): string {
  return `${base()}
| filter uid == "${q(uid)}" and is_llm == true and model != ""
| summarize chats = count(), tokens = sum(toLong(inp) + toLong(outp)), by:{model}
| sort chats desc`;
}

export function userToolMixQuery(uid: string): string {
  return `${base()}
| filter uid == "${q(uid)}" and is_tool == true
| fieldsAdd toolNm = coalesce(tool_name, gen_ai.tool.name, span.name)
| summarize calls = count(), by:{toolNm}
| sort calls desc
| limit 15`;
}

// ---------------------------------------------------------------------------
// Security strip (Overview) — condensed version of the reference dashboard's
// governance flags, per department.
// ---------------------------------------------------------------------------

export function securityByDeptQuery(): string {
  return `${base()}
| fieldsAdd
    is_terminal = (gen_ai.tool.name == "run_in_terminal" or tool_name == "Bash"),
    cmd_args = lower(coalesce(gen_ai.tool.call.arguments, full_command, "")),
    req_lower = if(isNotNull(copilot_chat.user_request), lower(copilot_chat.user_request), else: "")
| parse req_lower, "LD 'ghp_' (ALNUM{30,40}:ghK) LD"
| parse req_lower, "LD 'sk-' (ALNUM{40,}:oaK) LD"
| parse req_lower, "LD 'akia' (ALNUM{16}:awsK) LD"
| fieldsAdd
    flag_secret = (req_lower != "" and (isNotNull(ghK) or isNotNull(oaK) or isNotNull(awsK) or contains(req_lower, "sk-ant-api03-") or (contains(req_lower, "-----begin") and contains(req_lower, "private key")))),
    flag_destr = (is_terminal and (matchesValue(cmd_args, "rm -rf*") or contains(cmd_args, "sudo rm -rf") or contains(cmd_args, "&& rm -rf") or contains(cmd_args, "; rm -rf") or matchesValue(cmd_args, "chmod 777*") or contains(cmd_args, "mkfs") or contains(cmd_args, "dd if="))),
    flag_cred = (contains(cmd_args, "id_rsa") or contains(cmd_args, "id_ed25519") or contains(cmd_args, ".pem") or contains(cmd_args, ".ssh/") or contains(cmd_args, ".aws/credentials") or contains(cmd_args, "private_key")),
    flag_jail = (req_lower != "" and (contains(req_lower, "ignore all previous instruction") or contains(req_lower, "reveal your system prompt") or contains(req_lower, "do anything now") or contains(req_lower, "bypass your"))),
    flag_shadow = (is_llm and is_personal)
| summarize {
    secrets = countIf(flag_secret),
    destructive = countIf(flag_destr),
    credential = countIf(flag_cred),
    jailbreak = countIf(flag_jail),
    shadow = countIf(flag_shadow)
  }, by:{dept}
| fieldsAdd total = secrets + destructive + credential + jailbreak + shadow
| sort total desc`;
}
