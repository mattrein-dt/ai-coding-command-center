// Shared styling helpers built on Strato design tokens, so surfaces and tone
// colors are consistent across the app.

import Borders from "@dynatrace/strato-design-tokens/borders";
import BoxShadows from "@dynatrace/strato-design-tokens/box-shadows";
import Colors from "@dynatrace/strato-design-tokens/colors";
import type { CSSProperties } from "react";
import type { Tone } from "../data/taskKind";

/** Text color for a semantic tone. */
export function toneColor(tone: Tone): string {
  switch (tone) {
    case "primary":
    case "info":
      return Colors.Text.Primary.Default;
    case "warning":
      return Colors.Text.Warning.Default;
    case "critical":
      return Colors.Text.Critical.Default;
    default:
      return Colors.Text.Neutral.Default;
  }
}

export function borderColor(tone: Tone): string {
  switch (tone) {
    case "primary":
    case "info":
      return Colors.Border.Primary.Default;
    case "warning":
      return Colors.Border.Warning.Default;
    case "critical":
      return Colors.Border.Critical.Default;
    default:
      return Colors.Border.Neutral.Default;
  }
}

/** Raised card surface, matching the scaffold's Card component. */
export const surfaceStyle: CSSProperties = {
  border: `${Colors.Border.Neutral.Default}`,
  borderRadius: `${Borders.Radius.Container.Default}`,
  background: `${Colors.Background.Surface.Default}`,
  boxShadow: `${BoxShadows.Surface.Raised.Rest}`,
};

export const subduedText = Colors.Text.Neutral.Subdued;
