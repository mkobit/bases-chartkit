import * as R from 'remeda'

// Derives a stable per-chart-type sub-seed from the run's base seed, so
// every chart type samples independently -- adding or reordering entries in
// the registry never perturbs another chart type's already-generated data.
// FNV-1a is simple, dependency-free, and deterministic across platforms.
const FNV_OFFSET_BASIS = 0x81_1c_9d_c5
const FNV_PRIME = 0x01_00_01_93

function fnv1aHash(input: string): number {
  return R.pipe(
    Array.from(input),
    R.reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), FNV_PRIME), FNV_OFFSET_BASIS),
  )
}

export function deriveSubSeed(baseSeed: number, chartType: string): number {
  return fnv1aHash(`${baseSeed}:${chartType}`) >>> 0
}
