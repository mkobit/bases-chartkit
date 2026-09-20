import * as R from 'remeda'
import { DEFAULT_CATEGORICAL_PALETTE } from './transformers/palette'

export interface ObsidianCssTokens {
  readonly darkMode: boolean
  readonly backgroundPrimary: string
  readonly backgroundSecondary: string
  readonly backgroundModifierBorder: string
  readonly textNormal: string
  readonly textMuted: string
  readonly textFaint: string
  readonly textAccent: string
  readonly interactiveAccent: string
  readonly fontFamily?: string
  readonly palette: readonly string[]
}

export interface StyleResolverTarget {
  readonly ownerDocument?: {
    readonly body?: {
      readonly classList?: {
        readonly contains: (token: string) => boolean
      }
    }
    readonly defaultView?: unknown
  } | null
}

interface StyleContextView {
  readonly getComputedStyle: (elt: unknown) => {
    readonly getPropertyValue: (prop: string) => string
  } | null
}

function isStyleContextView(view: unknown): view is StyleContextView {
  return typeof view === 'object' && view !== null && 'getComputedStyle' in view && typeof view.getComputedStyle === 'function'
}

export interface ObsidianEChartsTheme {
  readonly darkMode: boolean
  readonly backgroundColor: string
  readonly color: readonly string[]
  readonly textStyle: {
    readonly color: string
    readonly fontFamily?: string
  }
  readonly title: {
    readonly textStyle: { readonly color: string }
    readonly subtextStyle: { readonly color: string }
  }
  readonly legend: {
    readonly textStyle: { readonly color: string }
    readonly inactiveColor: string
  }
  readonly tooltip: {
    readonly backgroundColor: string
    readonly borderColor: string
    readonly textStyle: { readonly color: string }
  }
  readonly categoryAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } }
    readonly axisTick: { readonly lineStyle: { readonly color: string } }
    readonly axisLabel: { readonly color: string }
    readonly splitLine: { readonly lineStyle: { readonly color: string } }
    readonly splitArea: { readonly show: boolean }
  }
  readonly valueAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } }
    readonly axisTick: { readonly lineStyle: { readonly color: string } }
    readonly axisLabel: { readonly color: string }
    readonly splitLine: { readonly lineStyle: { readonly color: string } }
    readonly splitArea: { readonly show: boolean }
  }
  readonly timeAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } }
    readonly axisTick: { readonly lineStyle: { readonly color: string } }
    readonly axisLabel: { readonly color: string }
    readonly splitLine: { readonly lineStyle: { readonly color: string } }
    readonly splitArea: { readonly show: boolean }
  }
  readonly logAxis: {
    readonly axisLine: { readonly lineStyle: { readonly color: string } }
    readonly axisTick: { readonly lineStyle: { readonly color: string } }
    readonly axisLabel: { readonly color: string }
    readonly splitLine: { readonly lineStyle: { readonly color: string } }
    readonly splitArea: { readonly show: boolean }
  }
  readonly grid: {
    readonly borderColor: string
  }
  readonly visualMap: {
    readonly textStyle: {
      readonly color: string
    }
  }
  readonly line: {
    readonly itemStyle: { readonly borderWidth: number }
    readonly lineStyle: { readonly width: number }
    readonly symbolSize: number
    readonly symbol: string
    readonly smooth: boolean
  }
  readonly bar: {
    readonly itemStyle: {
      readonly barBorderWidth: number
      readonly barBorderColor: string
    }
  }
  readonly pie: {
    readonly itemStyle: {
      readonly borderWidth: number
      readonly borderColor: string
    }
  }
  readonly scatter: {
    readonly itemStyle: {
      readonly borderWidth: number
      readonly borderColor: string
    }
  }
}

export const OBSIDIAN_AUTO_THEME_NAME = 'obsidian-auto'

function assembleTokens(
  getProp: (prop: string) => string,
  textNormal: string,
  backgroundPrimary: string,
  interactiveAccent: string,
  doc: { readonly body?: { readonly classList?: { readonly contains: (token: string) => boolean } } | null },
): ObsidianCssTokens {
  const isDark = doc.body?.classList?.contains('theme-dark') ?? false
  const resolvedTextNormal = textNormal || (isDark ? '#dcddde' : '#222222')
  const textMuted = getProp('--text-muted') || resolvedTextNormal
  const textFaint = getProp('--text-faint') || textMuted
  const textAccent = getProp('--text-accent') || interactiveAccent || resolvedTextNormal
  const backgroundSecondary = getProp('--background-secondary') || backgroundPrimary || (isDark ? '#202020' : '#f4f4f4')
  const backgroundModifierBorder = getProp('--background-modifier-border') || textFaint
  const resolvedAccent = interactiveAccent || '#705dcf'
  const fontFamily = getProp('--font-interface') || getProp('--font-text') || undefined

  const rawColors = [
    resolvedAccent,
    getProp('--color-blue'),
    getProp('--color-green'),
    getProp('--color-yellow'),
    getProp('--color-orange'),
    getProp('--color-red'),
    getProp('--color-purple'),
    getProp('--color-pink'),
    getProp('--color-cyan'),
  ]
  const obsidianColors = R.filter(rawColors, (c: string): boolean => c.length > 0)

  const palette = obsidianColors.length >= 3
    ? obsidianColors
    : DEFAULT_CATEGORICAL_PALETTE

  return {
    darkMode: isDark,
    backgroundPrimary: backgroundPrimary || (isDark ? '#1e1e1e' : '#ffffff'),
    backgroundSecondary,
    backgroundModifierBorder,
    textNormal: resolvedTextNormal,
    textMuted,
    textFaint,
    textAccent,
    interactiveAccent: resolvedAccent,
    ...(fontFamily ? { fontFamily } : {}),
    palette,
  }
}

function parseTokens(
  computed: { readonly getPropertyValue: (prop: string) => string },
  doc: { readonly body?: { readonly classList?: { readonly contains: (token: string) => boolean } } | null },
): ObsidianCssTokens | null {
  const getProp = (prop: string): string => computed.getPropertyValue(prop).trim()

  const textNormal = getProp('--text-normal')
  const backgroundPrimary = getProp('--background-primary')
  const interactiveAccent = getProp('--interactive-accent')

  return !textNormal && !backgroundPrimary && !interactiveAccent
    ? null
    : assembleTokens(getProp, textNormal, backgroundPrimary, interactiveAccent, doc)
}

function extractTokensFromView(
  el: unknown,
  doc: { readonly body?: { readonly classList?: { readonly contains: (token: string) => boolean } } | null },
  view: StyleContextView,
): ObsidianCssTokens | null {
  const computed = view.getComputedStyle(el)
  return !computed
    ? null
    : parseTokens(computed, doc)
}

/**
 * Extracts Obsidian CSS custom properties from an element or activeDocument.
 * Returns null if key Obsidian CSS properties are absent, indicating that
 * fallback to the default binary light/dark mode is appropriate.
 */
export function extractObsidianCssTokens(target?: StyleResolverTarget | Element | null): ObsidianCssTokens | null {
  const win = typeof window !== 'undefined' ? window : undefined
  const doc = target?.ownerDocument ?? (typeof activeDocument !== 'undefined' ? activeDocument : win?.document)
  const el = target ?? doc?.body
  const view = doc?.defaultView ?? win

  return !el || !doc || !isStyleContextView(view)
    ? null
    : extractTokensFromView(el, doc, view)
}

/**
 * Builds an ECharts theme definition conforming to Obsidian's CSS custom properties.
 */
export function buildEChartsThemeFromObsidian(tokens: ObsidianCssTokens): ObsidianEChartsTheme {
  const {
    darkMode,
    backgroundSecondary,
    backgroundModifierBorder,
    textNormal,
    textMuted,
    textFaint,
    fontFamily,
    palette,
  } = tokens

  const textStyle = {
    color: textNormal,
    ...(fontFamily ? { fontFamily } : {}),
  }

  const axisCommon = {
    axisLine: {
      lineStyle: {
        color: backgroundModifierBorder,
      },
    },
    axisTick: {
      lineStyle: {
        color: backgroundModifierBorder,
      },
    },
    axisLabel: {
      color: textMuted,
    },
    splitLine: {
      lineStyle: {
        color: backgroundModifierBorder,
      },
    },
    splitArea: {
      show: false,
    },
  }

  return {
    darkMode,
    backgroundColor: 'transparent',
    color: [...palette],
    textStyle,
    title: {
      textStyle: {
        color: textNormal,
      },
      subtextStyle: {
        color: textMuted,
      },
    },
    legend: {
      textStyle: {
        color: textNormal,
      },
      inactiveColor: textFaint,
    },
    tooltip: {
      backgroundColor: backgroundSecondary,
      borderColor: backgroundModifierBorder,
      textStyle: {
        color: textNormal,
      },
    },
    categoryAxis: axisCommon,
    valueAxis: axisCommon,
    timeAxis: axisCommon,
    logAxis: axisCommon,
    grid: {
      borderColor: backgroundModifierBorder,
    },
    visualMap: {
      textStyle: {
        color: textMuted,
      },
    },
    line: {
      itemStyle: {
        borderWidth: 1,
      },
      lineStyle: {
        width: 2,
      },
      symbolSize: 4,
      symbol: 'emptyCircle',
      smooth: false,
    },
    bar: {
      itemStyle: {
        barBorderWidth: 0,
        barBorderColor: '#ccc',
      },
    },
    pie: {
      itemStyle: {
        borderWidth: 0,
        borderColor: '#ccc',
      },
    },
    scatter: {
      itemStyle: {
        borderWidth: 0,
        borderColor: '#ccc',
      },
    },
  }
}

/**
 * Resolves the active theme name with strict precedence:
 * 1. View-level override (when not 'default').
 * 2. Plugin-level selectedTheme setting (when non-empty).
 * 3. Auto-derived Obsidian theme (when CSS custom properties exist).
 * 4. Fallback binary dark/light theme ('dark' or undefined).
 */
export function resolveTheme(
  chartTheme: string | undefined,
  pluginTheme: string | undefined,
  hasAutoTheme: boolean,
  isDark: boolean,
): string | undefined {
  return chartTheme && chartTheme !== 'default'
    ? chartTheme
    : pluginTheme
      ? pluginTheme
      : hasAutoTheme
        ? OBSIDIAN_AUTO_THEME_NAME
        : isDark
          ? 'dark'
          : undefined
}
