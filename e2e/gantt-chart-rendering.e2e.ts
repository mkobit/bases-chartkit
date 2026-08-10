import { Temporal } from 'temporal-polyfill'
import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'
import { formatDurationMs } from '../src/charts/transformers/formatters'

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

test.describe('gantt chart rendering', () => {
  test('hovering a task\'s bar shows its start, end, and duration in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'gantt/Basic.base', viewName: 'Marketing Campaign Schedule' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as GanttOptionLike | null
        return option ? findGanttTarget(option) : null
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).not.toBeNull()

    const option = await getChartOption(page) as GanttOptionLike
    const target = findGanttTarget(option)
    if (target === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
      throw new Error('no real (non-_start, non-placeholder) gantt bar found after polling succeeded')
    }

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: target.seriesIndex, dataIndex: target.dataIndex })

    const startStr = Temporal.Instant.fromEpochMilliseconds(target.start).toZonedDateTimeISO('UTC').toPlainDate().toString()
    const endStr = Temporal.Instant.fromEpochMilliseconds(target.end).toZonedDateTimeISO('UTC').toPlainDate().toString()

    expect(tooltipText).toContain(target.task)
    expect(tooltipText).toContain(target.seriesName)
    expect(tooltipText).toContain(`Start: ${startStr}`)
    expect(tooltipText).toContain(`End: ${endStr}`)
    expect(tooltipText).toContain(`Duration: ${formatDurationMs(target.duration)}`)
  })
})
