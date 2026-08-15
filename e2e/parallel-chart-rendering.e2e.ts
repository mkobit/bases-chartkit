import * as R from 'remeda'
import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'

interface ParallelSeriesLike {
  readonly data?: readonly unknown[]
}

test.describe('parallel chart rendering', () => {
  // Regression coverage for bck-44x: parallel is the one chart type where a
  // whole dataIndex renders as a single flat zrender Polyline (one point per
  // axis crossing, confirmed in
  // node_modules/echarts/lib/chart/parallel/ParallelView.js's addEl) rather
  // than a discrete shape or a Group of per-vertex symbols like radar --
  // getSeriesItemScreenPosition's isPolyline branch reads a specific vertex
  // straight out of the rendered shape's own `points` array instead of
  // guessing from a bounding-rect center, which for a zigzag line usually
  // falls in empty space between axes. vertexIndex: 1 (the middle axis,
  // Intelligence) exercises an interior vertex, not an edge one a bbox
  // heuristic might accidentally land on.
  test('hovering a character\'s line at an interior axis shows the whole row in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'parallel/Basic.base', viewName: 'Character stats (parallel)' })

    await expect.poll(
      async () => {
        const option = await getChartOption(page) as { readonly series?: readonly ParallelSeriesLike[] } | null
        return option?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // vertexIndex 1 targets an interior axis vertex (bck-44x: exercises the
    // isPolyline branch reading the exact rendered vertex, not a bounding-rect
    // center that lands between axes). The xProp axis order is
    // Strength, Intelligence, Agility -- so vertex 1 is each row's Intelligence
    // crossing, and each series data row is that axis-value triple.
    const interiorVertexIndex = 1

    // Series order is R.groupBy first-occurrence order of `Class`, which
    // follows Bases' row order and is NOT stable across vault-indexing states
    // (verified: series 0 was a Warrior in isolation but a Rogue as spec #25
    // under full-suite load). So derive the target row FROM the option rather
    // than hardcoding a class or index.
    const option = await getChartOption(page) as {
      readonly series?: ReadonlyArray<{ readonly name?: string, readonly data?: ReadonlyArray<ReadonlyArray<number | string>> }>
    } | null
    const rows = (option?.series ?? []).flatMap((series, seriesIndex) =>
      (series.data ?? []).map((values, dataIndex) => ({ seriesIndex, dataIndex, name: series.name ?? '', values })),
    )
    expect(rows.length).toBeGreaterThan(0)

    // At the Intelligence axis x-coordinate every polyline sits exactly at its
    // own Intelligence value's y, so two characters that share that value
    // share the identical vertex pixel -- hovering it is inherently ambiguous
    // and z-order alone decides which line's trigger:'item' tooltip fires
    // (bck-npq: Gandalf/Rogue and Draven/Warrior both have Intelligence 8, so
    // the hover flaked onto the Warrior row 'Warrior 13 8 6'). Pick a row whose
    // interior-axis value is UNIQUE across all characters, so no other line
    // touches that vertex and the resolved tooltip is deterministic.
    const interiorValueCounts = R.countBy(rows, row => String(row.values[interiorVertexIndex]))
    const target = rows.find(row => interiorValueCounts[String(row.values[interiorVertexIndex])] === 1)
    expect(target, 'no row has a unique interior-axis value to hover unambiguously').toBeTruthy()
    if (!target) {
      return
    }

    // Break the final move into several intermediate mousemove events (as
    // polar-line does): a single-jump teleport onto the ~1px-wide zigzag
    // polyline occasionally lands just off it under full-suite load, so the
    // trigger:'item' tooltip never fires within the 5s budget. Gradual moves
    // cross the line reliably.
    const tooltipText = await hoverChartDataPointAndGetTooltip(
      page,
      { seriesIndex: target.seriesIndex, dataIndex: target.dataIndex, vertexIndex: interiorVertexIndex },
      10,
    )

    // trigger:'item' shows the series name (the Class) plus every dimension
    // value of the hovered row.
    expect(tooltipText).toContain(target.name)
    for (const value of target.values) {
      expect(tooltipText).toContain(String(value))
    }
  })
})
