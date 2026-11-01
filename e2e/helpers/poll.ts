/**
 * Polling helper for Bun test runner.
 * Provides expect.poll compatibility with configurable intervals and timeouts.
 */

import { expect as bunExpect } from 'bun:test'

export interface PollOptions {
  readonly intervals?: readonly number[]
  readonly timeout?: number
  readonly message?: string
}

export type PollFunction<T> = () => T | Promise<T>

type PromisifiedMatcher<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer Args) => unknown
    ? (...args: Args) => Promise<void>
    : T[K] extends object
      ? PromisifiedMatcher<T[K]>
      : T[K]
}

export type PollExpect<T> = PromisifiedMatcher<ReturnType<typeof bunExpect<T>>>

/**
 * Creates a polling matcher that retries an assertion until it passes or times out.
 */
export function createPollMatcher<T>(
  fn: PollFunction<T>,
  options?: PollOptions,
  negated: boolean = false,
): PollExpect<T> {
  const timeoutMs = options?.timeout ?? 5_000
  const intervals = options?.intervals ?? [100, 250, 500, 1_000]

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- proxy wraps dynamic matcher properties
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined
      }

      if (prop === 'not') {
        return createPollMatcher(fn, options, !negated)
      }

      return async (...matcherArgs: readonly unknown[]): Promise<void> => {
        const startTime = Temporal.Now.instant().epochMilliseconds
        const deadline = startTime + timeoutMs

        const pollStep = async (attemptIndex: number, lastError: unknown): Promise<void> => {
          const now = Temporal.Now.instant().epochMilliseconds
          if (now >= deadline) {
            const failureReason = lastError instanceof Error ? lastError.message : String(lastError)
            const timeoutMessage = options?.message !== undefined
              ? `${options.message}\nPoll timed out after ${timeoutMs}ms: ${failureReason}`
              : `Poll timed out after ${timeoutMs}ms: ${failureReason}`
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
            throw new Error(timeoutMessage)
          }

          if (attemptIndex > 0) {
            const currentInterval = intervals[Math.min(attemptIndex - 1, intervals.length - 1)] ?? 250
            const sleepDuration = Math.min(currentInterval, Math.max(0, deadline - now))
            await Bun.sleep(sleepDuration)
          }

          try {
            const result = fn()
            const actual = result instanceof Promise ? await result : result
            const assertion = bunExpect(actual)
            const targetMatcher = negated ? assertion.not : assertion
            const matcherCandidate: unknown = Reflect.get(targetMatcher, prop)

            if (typeof matcherCandidate !== 'function') {
              // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain new Error(...); pre-existing false positive, see e2e/fixtures/obsidian.ts.
              throw new Error(`Unknown expectation matcher: ${prop}`)
            }

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- execute dynamic matcher function
            (matcherCandidate as (...args: readonly unknown[]) => void).apply(targetMatcher, matcherArgs as unknown[])
            return
          }
          catch (error: unknown) {
            return pollStep(attemptIndex + 1, error)
          }
        }

        return pollStep(0, undefined)
      }
    },
  }) as PollExpect<T>
}

/**
 * Augmented expect function that includes the poll method.
 */
export const expect = Object.assign(
  <T>(actual: T) => bunExpect(actual),
  bunExpect,
  {
    poll: <T>(fn: PollFunction<T>, options?: PollOptions): PollExpect<T> =>
      createPollMatcher(fn, options),
  },
)
