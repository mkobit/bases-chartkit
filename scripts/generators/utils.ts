import * as fc from 'fast-check'
/**
 * Generates the command string that reproduces this generation.
 */
export function generateCommandString(seed: number): string {
  return `pnpm examples:generate --seed ${seed}`
}
/**
 * Generates a deterministic sample from an arbitrary using a specific seed.
 */
export function getDeterministicSample<T>(arbitrary: fc.Arbitrary<T>, seed: number): T {
  const samples = fc.sample(
    arbitrary,
    {
      seed,
      numRuns: 1,
    },
  )
  // We guaranteed at least one run, so index 0 exists.
  // Using non-null assertion as fast-check contract guarantees this with numRuns: 1
  // @ts-expect-error - suppress strictNullChecks/type errors
  return samples[0]
}
