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

export function defineChartExampleSpec<T>(config: ChartExampleSpecConfig<T>): ChartExampleSpec {
  return {
    chartType: config.chartType,
    description: config.description,
    notePrefix: config.notePrefix,
    variants: config.variants,
    sampleRows: (seed) => {
      const subSeed = deriveSubSeed(seed, config.chartType)
      const sample = getDeterministicSample(config.arbitrary, subSeed)
      return config.toRows(sample)
    },
  }
}
