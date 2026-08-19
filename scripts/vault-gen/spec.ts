import type * as fc from 'fast-check'
import type { FrontmatterValue } from './schema'
import { getDeterministicSample } from '../generators/utils'
import { deriveSubSeed } from './seed'

// One `.base` file: a single view (per this repo's one-file-per-view
// convention) with either the canonical "Basic" example or a settings
// variant (legend placement, flipped axis, etc.) of the same chart type,
// sharing the same generated notes.
export interface ChartVariantSpec {
  readonly fileName: string
  readonly viewName: string
  readonly viewType: string
  readonly propBindings: Readonly<Record<string, string>>
  readonly literalOptions?: Readonly<Record<string, string | number | boolean>>
  readonly filters?: readonly string[]
  // Bases-native computed columns for this .base file's top-level `formulas:`
  // block (keyed by formula name, valued by a Bases formula expression). A
  // binding can then reference the result as `formula.<name>` -- e.g. a
  // date-formatting formula feeding an axis prop. Merged across all variants
  // sharing one file.
  readonly formulas?: Readonly<Record<string, string>>
}

export type FrontmatterRow = Readonly<Record<string, FrontmatterValue>>

// Type-erased view of a chart-type spec: `sampleRows` closes over the
// arbitrary's specific sample type internally (see defineChartExampleSpec
// below), so a heterogeneous registry of many chart types never needs a
// type cast to store specs with different sample shapes side by side.
// Split into data + behavior halves via intersection (rather than one
// interface mixing plain fields and a function field) per this repo's
// eslint-plugin-functional/no-mixed-types rule.
export type ChartExampleSpec
  = & Readonly<{
    chartType: string
    description: string
    notePrefix: string
    variants: readonly ChartVariantSpec[]
    // Link to the canonical Apache ECharts gallery example this chart type
    // is modeled after, so a maintainer can visually/behaviorally compare
    // this plugin's rendering against ECharts' own reference (bck-i9b.6).
    // Omitted for chart types with no confirmed 1:1 gallery example -- see
    // the comment on `echartsExample` below for why this is never derived
    // from `chartType` automatically.
    echartsExampleUrl?: string
  }>
  & Readonly<{
    sampleRows: (seed: number) => readonly FrontmatterRow[]
  }>

export type ChartExampleSpecConfig<T>
  = & Readonly<{
    chartType: string
    description: string
    notePrefix: string
    variants: readonly ChartVariantSpec[]
    echartsExampleUrl?: string
  }>
  & Readonly<{
    arbitrary: fc.Arbitrary<T>
    toRows: (sample: T) => readonly FrontmatterRow[]
  }>

// Vault-relative path to a variant's .base file: every variant lives in its
// specified .base file directly under `chartType/` (defaulting to
// `Basic.base`), containing multiple views for variants unless split into
// separate files for materially different dataset schemas.
export function variantRelativePath(chartType: string, variant: ChartVariantSpec): string {
  return `${chartType}/${variant.fileName}`
}

// Builds a gallery URL from an ECharts example id (the `c=` slug used by
// https://echarts.apache.org/examples/en/editor.html). The id is NOT
// derivable from this repo's `chartType` -- e.g. `rose` maps to gallery id
// `pie-roseType-simple`, `histogram` maps to `bar-histogram`, and several
// chart types (bullet, pareto) have no gallery example at all. Every call
// site in registry.ts passes an id that was manually confirmed against
// Apache ECharts' own generated example list (`src/data/chart-list-data.js`
// in apache/echarts-examples) -- never guess one from a chart-type slug.
export function echartsExample(id: string): string {
  return `https://echarts.apache.org/examples/en/editor.html?c=${id}`
}

export function defineChartExampleSpec<T>(config: ChartExampleSpecConfig<T>): ChartExampleSpec {
  return {
    chartType: config.chartType,
    description: config.description,
    notePrefix: config.notePrefix,
    variants: config.variants,
    echartsExampleUrl: config.echartsExampleUrl,
    sampleRows: (seed) => {
      const subSeed = deriveSubSeed(seed, config.chartType)
      const sample = getDeterministicSample(config.arbitrary, subSeed)
      return config.toRows(sample)
    },
  }
}
