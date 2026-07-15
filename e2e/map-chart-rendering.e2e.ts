import { test, expect } from './fixtures/obsidian'
import { evaluateObsidian, getMapSeriesState } from './helpers/evaluate'
import type { MapSeriesState } from './helpers/evaluate'
import * as R from 'remeda'

// Narrows out the ECharts-auto-filled "Chicago" boundary entry (which carries
// no EventCount) and its still-unresolved (null) siblings, so downstream code
// sees `value: number` instead of `number | null` -- not just a boolean filter.
const isResolvedLandmark = (item: MapSeriesState['items'][number]): item is { readonly name: string, readonly value: number } =>
  item.name !== 'Chicago' && item.value !== null

test.describe('map chart rendering', () => {
  // Regression test for obsidian-bases-charts-uae: the Chicago landmarks
  // GeoJSON asset must actually parse and register with ECharts, and each
  // note's Landmark value must match a real feature name in that file.
  // Neither is checked by unit tests, which only exercise the transformer's
  // static output against synthetic data -- a malformed asset or a
  // regionProp/GeoJSON name mismatch only surfaces once the real map file is
  // loaded and registered by the live chart.
  test('registers the real GeoJSON asset and resolves every landmark region', async ({ obsidianPage: { page } }) => {
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
    }, { path: 'Map-Chart.base', viewName: 'Chicago landmarks by event count' })

    // registerMap (asset load) and Bases' query (note data) resolve on
    // separate async paths, so item values stay null until both settle.
    await expect.poll(
      async () => {
        const state = await getMapSeriesState(page, { seriesIndex: 0 })
        return R.pipe(state?.items ?? [], R.filter(isResolvedLandmark), R.length())
      },
      { timeout: 30_000 },
    ).toBe(5)

    const state = await getMapSeriesState(page, { seriesIndex: 0 })

    expect(state?.subType).toBe('map')
    expect(state?.mapName).toBe('Assets/chicago-landmarks.geo.json')

    // The full set of features actually present in the registered GeoJSON --
    // proves the real asset (not a stub) parsed successfully, in file order.
    expect(state?.regionNames).toEqual(['Chicago', 'Millennium Park', 'Navy Pier', 'Wrigley Field', 'Grant Park', 'Lincoln Park'])

    // Each landmark note's Landmark value must resolve to one of those real
    // features -- a typo here would silently leave the region unhighlighted.
    const landmarkValuesByName = R.pipe(
      state?.items ?? [],
      R.filter(isResolvedLandmark),
      R.mapToObj(item => [item.name, item.value]),
    )
    expect(landmarkValuesByName).toEqual({
      'Millennium Park': 18,
      'Navy Pier': 9,
      'Wrigley Field': 6,
      'Grant Park': 22,
      'Lincoln Park': 27,
    })
    for (const name of R.keys(landmarkValuesByName)) {
      expect(state?.regionNames).toContain(name)
    }
  })
})
