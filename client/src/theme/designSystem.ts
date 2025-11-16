/**
 * Central design tokens used to keep styling consistent across the app.
 * Prefer importing helpers from this file instead of hard-coding colors,
 * spacing, or radii in new components.
 */
type HexColor = `#${string}`;

export const baseColors = {
  softLinen: "#F4F1ED",
  clay: "#DED6CB",
  charcoalTaupe: "#4A4742",
  fadedClay: "#B8816A",
} as const satisfies Record<string, HexColor>;

export type BaseColorToken = keyof typeof baseColors;

export const semanticColors = {
  background: baseColors.softLinen,
  bodyText: baseColors.charcoalTaupe,
  messageBubble: baseColors.clay,
  messageText: baseColors.charcoalTaupe,
  widget: baseColors.fadedClay,
  widgetText: baseColors.softLinen,
} as const;

export type SemanticColorToken = keyof typeof semanticColors;

type ComponentToken = {
  background: HexColor | `var(${string})`;
  text: HexColor | `var(${string})`;
  cssVar: `--${string}`;
  foregroundVar: `--${string}`;
};

const componentTokens = {
  chatBubble: {
    agent: {
      background: semanticColors.messageBubble,
      text: semanticColors.messageText,
      cssVar: "--bubble-agent",
      foregroundVar: "--bubble-agent-foreground",
    },
    user: {
      background: semanticColors.messageBubble,
      text: semanticColors.messageText,
      cssVar: "--bubble-user",
      foregroundVar: "--bubble-user-foreground",
    },
  },
  widgetSurface: {
    default: {
      background: semanticColors.widget,
      text: semanticColors.widgetText,
      cssVar: "--widget",
      foregroundVar: "--widget-foreground",
    },
  },
} as const satisfies Record<string, Record<string, ComponentToken>>;

export type ComponentTokenGroup = keyof typeof componentTokens;
export type ComponentTokenVariant<G extends ComponentTokenGroup> = keyof (typeof componentTokens)[G];

export function getSemanticColor(token: SemanticColorToken) {
  return semanticColors[token];
}

export function getComponentToken<G extends ComponentTokenGroup>(
  group: G,
  variant: ComponentTokenVariant<G>
) {
  return componentTokens[group][variant];
}

export const designSystem = {
  colors: {
    base: baseColors,
    semantic: semanticColors,
    components: componentTokens,
  },
  radii: {
    bubble: "1.5rem",
    card: "1rem",
  },
  spacing: {
    bubblePadding: "1rem",
    widgetPadding: "1.5rem",
  },
} as const;

export type DesignSystem = typeof designSystem;

