import type { ViewOption } from 'obsidian'
import { Notice } from 'obsidian'
import { BaseChartView } from './base-chart-view'
import * as echarts from 'echarts'
import { transformDataToChartOption } from '../charts/transformer'
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
      // No map file selected, clear or show empty
      this.executeRender()
      return
    }

    if (this.registeredMapName === mapFile) {
      // Map already registered
      this.executeRender()
      return
    }

    // Load map asynchronously
    void (async () => {
      try {
        const adapter = this.plugin.app.vault.adapter
        if (!(await adapter.exists(mapFile))) {
          new Notice(`Map file not found: ${mapFile}`)
          return
        }

        const content = await adapter.read(mapFile)
        const geoJson = geoJsonSchema.parse(content)

        echarts.registerMap(
          mapFile,
          // zod parse yields a generic GeoJSON object; ECharts' registerMap
          // parameter type is an unexported internal shape that overlaps.
          // eslint-disable-next-line no-restricted-syntax
          (geoJson as unknown) as Parameters<typeof echarts.registerMap>[1],
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
      // If map isn't ready or doesn't match config, return null (wait for renderChart to load it)
      return null
    }

    return transformDataToChartOption(
      data,
      'Map Chart', // Dummy xProp for title if needed, or we can adjust transformer signature
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

  static getViewOptions(): ViewOption[] {
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
