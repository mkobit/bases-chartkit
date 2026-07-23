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
    }, { path: 'map/Basic.base', viewName: 'Chicago landmarks by event count' })

    // registerMap (asset load) and Bases' query (note data) resolve on
    // separate async paths, so item values stay null until both settle.
    // 60s rather than this repo's usual 30s: a cold Obsidian profile now
    // indexes the whole (much larger, post-reorg) example vault before Bases
    // queries resolve, and that alone can take longer than 30s.
    await expect.poll(
      async () => {
        const state = await getMapSeriesState(page, { seriesIndex: 0 })
        return R.pipe(state?.items ?? [], R.filter(isResolvedLandmark), R.length())
      },
      { timeout: 60_000 },
    ).toBe(5)

    const state = await getMapSeriesState(page, { seriesIndex: 0 })

    expect(state?.subType).toBe('map')
    expect(state?.mapName).toBe('map/assets/chicago-landmarks.geo.json')

    // The full set of features actually present in the registered GeoJSON --
    // proves the real asset (not a stub) parsed successfully, in file order.
    expect(state?.regionNames).toEqual(['Chicago', 'Millennium Park', 'Navy Pier', 'Wrigley Field', 'Grant Park', 'Lincoln Park'])

    // Each landmark note's Landmark value must resolve to one of those real
    // features -- a typo here would silently leave the region unhighlighted.
    // EventCount itself comes from a seeded fast-check arbitrary (see
    // scripts/generators/map.ts) rather than fixed sample data, so this
    // checks every real landmark resolved with a positive count rather than
    // asserting exact numbers.
    const landmarkValuesByName = R.pipe(
      state?.items ?? [],
      R.filter(isResolvedLandmark),
      R.mapToObj(item => [item.name, item.value]),
    )
    const EXPECTED_LANDMARK_NAMES = ['Millennium Park', 'Navy Pier', 'Wrigley Field', 'Grant Park', 'Lincoln Park']
    expect(R.sortBy(R.keys(landmarkValuesByName), x => x)).toEqual(R.sortBy(EXPECTED_LANDMARK_NAMES, x => x))
    for (const name of EXPECTED_LANDMARK_NAMES) {
      expect(landmarkValuesByName[name]).toBeGreaterThan(0)
      expect(state?.regionNames).toContain(name)
    }
  })
})
