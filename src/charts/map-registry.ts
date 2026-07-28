import * as echarts from 'echarts'

// ECharts' geo map registry (internally `geoSourceManager`'s storage,
// populated via echarts.registerMap) has no public unregister/remove API in
// this ECharts version -- only `registerMap`/`getMap` are exported, so a
// registered map name's entry is never freed for the plugin's session
// lifetime by design of the library, not by omission here. What IS fixable
// in userland is redundant work: without this check, every view render for
// an already-registered map name re-read + re-parsed the vault file and
// called registerMap again, needlessly overwriting the same entry.
// echarts.getMap is used directly as the source of truth instead of a
// second, separately-mutated cache that could drift from ECharts' own state.
export function isMapRegistered(name: string): boolean {
  return echarts.getMap(name) !== undefined
}

// Only invokes `loadGeoJson` (a vault read + parse) when `name` isn't
// already registered -- re-selecting an already-registered map anywhere in
// the same session is then just an `echarts.getMap` lookup, no vault I/O.
export function acquireMap(
  name: string,
  loadGeoJson: () => Promise<Parameters<typeof echarts.registerMap>[1]>,
): Promise<void> {
  return isMapRegistered(name)
    ? Promise.resolve()
    : loadGeoJson().then(geoJson => echarts.registerMap(name, geoJson))
}
