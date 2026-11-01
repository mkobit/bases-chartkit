import { describe, test } from 'bun:test'
import { expect } from '../e2e/helpers/poll'

class Counter {
  public count: number = 0

  public increment(): number {
    this.count += 1
    return this.count
  }

  public async incrementAsync(): Promise<number> {
    await Bun.sleep(1)
    this.count += 1
    return this.count
  }
}

describe('Test polling helper', () => {
  test('polls async function until expectation passes', async () => {
    const counter = new Counter()

    await expect.poll(async () => counter.incrementAsync(), {
      timeout: 1_000,
      intervals: [10],
    }).toBe(3)

    expect(counter.count).toBe(3)
  })

  test('polls synchronous function until expectation passes', async () => {
    const counter = new Counter()

    await expect.poll(() => counter.increment(), {
      timeout: 1_000,
      intervals: [10],
    }).toBe(2)

    expect(counter.count).toBe(2)
  })

  test('supports negated matchers with not property', async () => {
    const counter = new Counter()

    await expect.poll(() => counter.increment(), {
      timeout: 1_000,
      intervals: [10],
    }).not.toBe(0)

    expect(counter.count).toBe(1)
  })

  test('supports toEqual with structured data', async () => {
    const counter = new Counter()

    await expect.poll(() => {
      counter.increment()
      return { status: counter.count >= 2 ? 'ready' : 'pending' }
    }, {
      timeout: 1_000,
      intervals: [10],
    }).toEqual({ status: 'ready' })
  })

  test('supports numeric comparison matchers', async () => {
    const counter = new Counter()

    await expect.poll(() => counter.increment(), {
      timeout: 1_000,
      intervals: [10],
    }).toBeGreaterThan(2)

    expect(counter.count).toBe(3)
  })

  test('supports array and length matchers', async () => {
    const counter = new Counter()

    await expect.poll(() => {
      counter.increment()
      return counter.count >= 3 ? ['a', 'b', 'c'] : ['a']
    }, {
      timeout: 1_000,
      intervals: [10],
    }).toHaveLength(3)
  })

  test('throws error when expectation times out', async () => {
    const counter = new Counter()

    const promise = expect.poll(() => counter.increment(), {
      timeout: 50,
      intervals: [10],
    }).toBe(999)

    expect(promise).rejects.toThrow('Poll timed out after 50ms')
  })

  test('includes custom failure message in timeout error', async () => {
    const promise = expect.poll(() => false, {
      timeout: 50,
      intervals: [10],
      message: 'Chart element did not render in time',
    }).toBe(true)

    expect(promise).rejects.toThrow('Chart element did not render in time')
  })
})
