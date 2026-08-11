import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getChartOption, hoverChartDataPointAndGetTooltip, VAULT_INDEXED_POLL_TIMEOUT_MS } from './helpers/evaluate'
import * as R from 'remeda'

interface WordCloudOptionLike {
  readonly series?: ReadonlyArray<{ readonly data?: ReadonlyArray<{ readonly name?: string, readonly value?: number }> }>
}

test.describe('word cloud chart rendering', () => {
  // Regression coverage for bck-44j: echarts-wordcloud's custom 'wordCloud'
  // series (node_modules/echarts-wordcloud/src/WordCloudView.js) DOES set a
  // per-dataIndex graphic element -- `data.setItemGraphicEl(dataIdx, textEl)`,
  // where textEl is a single zrender Text leaf -- so the existing
  // getItemGraphicEl-based helper needs no changes for this series type.
  // The real risk is layout convergence, not the graphic-element model:
  // wordCloud.js sorts the placement list largest-first
  // (`list...sort((a, b) => b[1] - a[1])`) and hands it to wordcloud2.js's
  // packed layout, which can leave smaller/later words entirely undrawn
  // (`drawOutOfBound: false`, transformers/extensions/word-cloud.ts) if there's
  // no room left. Hovering the single largest-frequency word sidesteps that
  // risk entirely: it's placed first, onto a still-empty grid, so it always
  // gets a graphic element regardless of how the rest of the layout resolves.
  test('hovering the highest-frequency word shows it and its count in the tooltip', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'word-cloud/Basic.base', viewName: 'Keyword frequency (word cloud)' })

    await expect.poll(
      async () => {
        const opt = await getChartOption(page) as WordCloudOptionLike | null
        return opt?.series?.[0]?.data?.length ?? 0
      },
      { timeout: VAULT_INDEXED_POLL_TIMEOUT_MS },
    ).toBeGreaterThan(0)

    // Keyword-04.md ({ Word: "Templates", Frequency: 100 }) is the highest
    // frequency among the committed vault notes -- but the option's data
    // order (not the layout's placement order) is what setItemGraphicEl's
    // dataIndex addresses, so find that word's live dataIndex rather than
    // hand-deriving it, guarding against note-content drift.
    const option = await getChartOption(page) as WordCloudOptionLike | null
    const words = option?.series?.[0]?.data ?? []
    const maxWord = R.firstBy(words, [w => w.value ?? Number.NEGATIVE_INFINITY, 'desc'])
    const maxIndex = maxWord ? words.indexOf(maxWord) : -1
    expect(maxIndex).toBeGreaterThanOrEqual(0)

    const tooltipText = await hoverChartDataPointAndGetTooltip(page, { seriesIndex: 0, dataIndex: maxIndex })

    expect(tooltipText).toContain(maxWord?.name ?? '')
    expect(tooltipText).toContain((maxWord?.value ?? 0).toLocaleString('en-US'))
  })
})
