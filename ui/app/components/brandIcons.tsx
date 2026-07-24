// Inline brand marks for the coding assistants. Embedded as SVG (not external
// images) because the app runs under a strict CSP. Used as descriptive labels
// to identify which assistant produced a span / session.

import React from "react";

/** Anthropic / Claude sunburst mark, in Claude's clay tone. */
export function AnthropicIcon({ size = 16 }: { size?: number }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" role="img" aria-label="Claude">
      {rays.map((a) => (
        <rect key={a} x={-1.05} y={-11} width={2.1} height={6.4} rx={1.05} fill="#CC785C" transform={`rotate(${a})`} />
      ))}
      <circle r={1.7} fill="#CC785C" />
    </svg>
  );
}

/** GitHub mark, for GitHub Copilot. Uses currentColor so it works in both themes. */
export function CopilotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="GitHub Copilot" fill="currentColor">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.83.58C20.56 22.3 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

/** Pick the brand mark for an assistant label ("Claude Code", "GitHub Copilot", "Copilot", …). */
export function assistantBrandIcon(assistant: string | undefined, size = 16): React.ReactNode {
  if ((assistant ?? "").toLowerCase().includes("copilot")) return <CopilotIcon size={size} />;
  return <AnthropicIcon size={size} />;
}
