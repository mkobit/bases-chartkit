import { test, expect } from './fixtures/obsidian'
import { asOptionLike, evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface GanttDataItem {
  readonly value: number
  readonly start: number
  readonly end: number
}

interface GanttSeriesLike {
  readonly name?: string
  readonly data?: ReadonlyArray<unknown>
}

interface GanttOptionLike {
  readonly series?: ReadonlyArray<GanttSeriesLike>
  readonly yAxis?: ReadonlyArray<{ readonly data?: ReadonlyArray<string> }>
}

interface GanttTarget {
  readonly seriesIndex: number
  readonly dataIndex: number
  readonly task: string
  readonly seriesName: string
  readonly start: number
  readonly end: number
  readonly duration: number
}

function isGanttDataItem(item: unknown): item is GanttDataItem {
  return typeof item === 'object' && item !== null && 'value' in item && 'start' in item && 'end' in item
}

function findGanttTarget(option: GanttOptionLike): GanttTarget | null {
  const tasks = option.yAxis?.[0]?.data ?? []
  const series = option.series ?? []

  const candidates = series.flatMap((s, seriesIndex) => {
    const seriesName = s.name
    if (seriesName === undefined || seriesName === '_start') {
      return []
    }
    return (s.data ?? []).flatMap((item, dataIndex) =>
      isGanttDataItem(item)
        ? [{
            seriesIndex,
            dataIndex,
            task: tasks[dataIndex] ?? '',
            seriesName,
            start: item.start,
            end: item.end,
            duration: item.value,
          }]
        : [])
  })

  return candidates[0] ?? null
}

async function openBasesView(page: Parameters<typeof getChartOption>[0], path: string, viewName: string): Promise<void> {
  await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
    await new Promise<void>((resolve) => {
      app.workspace.onLayoutReady(() => {
        resolve()
      })
    })
    const leaf = app.workspace.getLeaf('tab')
    await leaf.setViewState({
      type: 'bases',
      state: { file: args.path, viewName: args.viewName },
      active: true,
    })
  }, { path, viewName })
}

function groupNamesOf(option: GanttOptionLike | null): readonly string[] {
  return (option?.series ?? [])
    .map(s => s.name)
    .filter((n): n is string => n !== undefined && n !== '_start')
}

test.describe('gantt chart rendering', () => {
  test('hovering a task\'s bar shows its start, end, and duration in the tooltip', async ({ obsidianPage: { page } }) => {
    await openBasesView(page, 'gantt/Basic.base', 'Delivery timeline by phase')

    await expect.poll(
      async () => {
        const option = asOptionLike<GanttOptionLike>(await getChartOption(page))
        return option ? findGanttTarget(option) : null
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).not.toBeNull()

    const option = asOptionLike<GanttOptionLike>(await getChartOption(page)) ?? {}
    const target = findGanttTarget(option)
    if (target === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('no real (non-_start, non-placeholder) gantt bar found after polling succeeded')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: target.seriesIndex, dataIndex: target.dataIndex })

    const utcFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' })
    const startStr = utcFormatter.format(target.start)
    const endStr = utcFormatter.format(target.end)

    expect(tooltipText).toContain(target.task)
    expect(tooltipText).toContain(target.seriesName)
    expect(tooltipText).toContain(`Start: ${startStr}`)
    expect(tooltipText).toContain(`End: ${endStr}`)
    expect(tooltipText).toContain('Duration:')
  })

  test('a formula.* seriesProp groups tasks by a Bases-computed column', async ({ obsidianPage: { page } }) => {
    // Formula.base binds seriesProp to formula.StartMonth
    // (= Start.format("MMM YYYY")). If formula.* resolution didn't flow through
    // the gantt property picker, grouping would collapse to a single bogus
    // bucket instead of real month labels -- this asserts the platform
    // capability (bck-g79) end-to-end against the live Bases formula engine.
    await openBasesView(page, 'gantt/Formula.base', 'Delivery timeline (quarter-labeled axis)')

    await expect.poll(
      async () => groupNamesOf(asOptionLike<GanttOptionLike>(await getChartOption(page))).length,
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(1)

    const groupNames = groupNamesOf(asOptionLike<GanttOptionLike>(await getChartOption(page)))

    // Every group name is a formatted "MMM YYYY" -> contains a 4-digit year.
    expect(groupNames.every(name => /\b\d{4}\b/.test(name))).toBe(true)
  })
})
