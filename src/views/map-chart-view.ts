import type { BasesOptions } from 'obsidian'
import { Notice } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import type * as echarts from 'echarts'
import { transformDataToChartOption } from '../charts/transformer'
import { acquireMap } from '../charts/map-registry'
import type { EChartsOption } from 'echarts'
import type { BasesData } from '../charts/transformers/base'
import { z } from 'zod'
import { jsonParsed } from '../json-parsing'
import { t } from '../lang/text'

const geoJsonSchema = jsonParsed(z.object({}).loose())

export class MapChartView extends BaseChartView {
  readonly type = 'map-chart'
  private registeredMapName: string | null = null

  public static readonly MAP_FILE_KEY = 'mapFile'
  public static readonly REGION_PROP_KEY = 'regionProp'

  protected renderChart(): void {
    const mapFile = this.config.get(MapChartView.MAP_FILE_KEY) as string

    if (!mapFile) {
      this.executeRender()
      return
    }

    if (this.registeredMapName === mapFile) {
      this.executeRender()
      return
    }

    // Load map asynchronously. acquireMap only reads/parses the vault file
    // when `mapFile` isn't already registered globally (e.g. by another open
    // map-chart view, or this view's own earlier session) -- switching back
    // to a previously-seen map skips straight to reuse instead of forcing a
    // redundant vault read + re-registration.
    void (async () => {
      try {
        await acquireMap(
          mapFile,
          async () => {
            const adapter = this.plugin.app.vault.adapter
            if (!(await adapter.exists(mapFile))) {
              // eslint-disable-next-line @typescript-eslint/only-throw-error -- this is a plain `new Error(...)`; see the identical disable in e2e/fixtures/obsidian.ts for the same pre-existing false positive.
              throw new Error(`Map file not found: ${mapFile}`)
            }
            const content = await adapter.read(mapFile)
            const geoJson = geoJsonSchema.parse(content)
            // eslint-disable-next-line no-restricted-syntax -- zod parse yields a generic GeoJSON object; ECharts' registerMap parameter type is an unexported internal shape that overlaps.
            return (geoJson as unknown) as Parameters<typeof echarts.registerMap>[1]
          },
        )

        this.registeredMapName = mapFile
        this.executeRender()
      }
      catch (e) {
        new Notice(`Failed to load map file: ${e instanceof Error ? e.message : String(e)}`)
      }
    })()
  }

  protected getChartOption(data: BasesData): EChartsOption | null {
    const mapFile = this.config.get(MapChartView.MAP_FILE_KEY) as string
    const regionProp = this.config.get(MapChartView.REGION_PROP_KEY) as string
    const valueProp = this.config.get(BaseChartView.VALUE_PROP_KEY) as string

    if (!mapFile || this.registeredMapName !== mapFile) {
      // Map not loaded yet; renderChart loads it asynchronously, then re-renders.
      return null
    }

    return transformDataToChartOption(
      data,
      'Map Chart', // placeholder xProp; maps have no x axis
      valueProp,
      'map',
      {
        ...this.getCommonTransformerOptions(),
        mapName: mapFile,
        regionProp: regionProp,
        valueProp: valueProp,
        ...this.getVisualMapTransformerOptions(),
      },
    )
  }

  static getViewOptions(): BasesOptions[] {
    return [
      {
        displayName: t('views.map.map_file'),
        type: 'text',
        key: MapChartView.MAP_FILE_KEY,
        placeholder: t('views.map.map_file_placeholder'),
      },
      {
        displayName: t('views.map.region_prop'),
        type: 'property',
        key: MapChartView.REGION_PROP_KEY,
        placeholder: t('views.map.region_placeholder'),
      },
      {
        displayName: t('views.map.value_prop'),
        type: 'property',
        key: BaseChartView.VALUE_PROP_KEY,
        placeholder: t('views.map.value_placeholder'),
      },
      ...BaseChartView.getCommonViewOptions().filter((o) => {
        const key = (o as { key?: string }).key
        return key !== BaseChartView.X_AXIS_PROP_KEY && key !== BaseChartView.Y_AXIS_PROP_KEY && key !== BaseChartView.SERIES_PROP_KEY
      }),
      {
        displayName: t('views.map.title'),
        type: 'text',
        key: BaseChartView.X_AXIS_LABEL_KEY, // Reusing X-Axis Label as Title for Maps
        placeholder: t('views.map.title_placeholder'),
      },
      ...BaseChartView.getVisualMapViewOptions(),
    ]
  }
}
