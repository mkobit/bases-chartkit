import { Temporal } from 'temporal-polyfill'
import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

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

/**
 * gantt's transformer (src/charts/transformers/gantt.ts) builds a pair of
 * stacked bar series per unique Project (seriesProp) value: an invisible
 * '_start' offset series (silent, `tooltip: { show: false }` -- never a
 * hover target) and a visible duration series named after the project. Every
 * series shares the same y-axis 'tasks' category list, so a series' data at
 * a given dataIndex is the placeholder string '-' whenever that task doesn't
 * belong to that project. Find the first (seriesIndex, dataIndex) pair
 * that's both a real (non-'_start') series and a real (non-'-') data item,
 * rather than assuming seriesIndex 0 or dataIndex 0 is hoverable.
 */
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
  // Regression coverage for bck-44j: extends the bar/radar hover-tooltip
  // pattern to gantt's paired '_start'/duration bar series. Neither
  // seriesIndex 0 (the first project's invisible '_start' series) nor
  // dataIndex 0 in an arbitrary series (frequently the '-' placeholder for a
  // task outside that project) is a safe hover target -- findGanttTarget
  // reads the live option to find a real pair instead (see its doc comment
  // above). gantt's custom tooltip formatter (formatTooltip in gantt.ts)
  // renders 'Start: <date><br/>End: <date><br/>Duration: <ms>ms', not
  // ECharts' default tooltip -- match that literal template.
  test('hovering a task\'s bar shows its start, end, and duration in the tooltip', async ({ obsidianPage: { page } }) => {
    await evaluateObsidian(page, async (app, args: { path: string, viewName: string }) => {
      await new Promise<void>((resolve) => {
        app.workspace.onLayoutReady(() => resolve())
      })
      const leaf = app.workspace.getLeaf('tab')
      await leaf.setViewState({
        type: 'bases',
        state: { file: args.path, viewName: args.viewName },
        active: true,
      })
    }, { path: 'gantt/Basic.base', viewName: 'Project Gantt chart' })

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
    expect(tooltipText).toContain(`Duration: ${target.duration}ms`)
  })
})
