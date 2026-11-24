import { parseYaml } from 'obsidian'
import type { BasesOptions, BasesPropertyId, QueryController } from 'obsidian'
import type { EChartsOption } from 'echarts'
import * as R from 'remeda'
import type BarePlugin from '../main'
import type { BasesData } from '../charts/transformers/base'
import { isRecord } from '../charts/transformers/bases-values'
import {
  injectBasesDataset,
  serializeBasesDataset,
  type BasesDatasetEntryLike,
} from '../charts/dataset'
import { t } from '../lang/text'
import { BaseChartView } from './base-chart-view'

export type EChartsViewState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready' }

export interface ResolveEChartsOptionResult {
  readonly state: EChartsViewState
  readonly option: EChartsOption | null
}

function isEmptyYamlOption(raw: string): boolean {
  return raw.split('\n').every(line => {
    const trimmed = line.trim()
    return trimmed.length === 0 || trimmed.startsWith('#')
  })
}

export function formatEChartsErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err
  }
  return fallback
}

export function mergeOrderedProperties(
  visibleProperties: readonly BasesPropertyId[],
  allProperties: readonly BasesPropertyId[],
): readonly BasesPropertyId[] {
  return R.unique([...visibleProperties, ...allProperties])
}

function parseRawOption(
  rawOption: string,
  parseYamlFn: (yaml: string) => unknown,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string } {
  try {
    return { ok: true, value: parseYamlFn(rawOption) }
  } catch (err: unknown) {
    return {
      ok: false,
      error: t('views.echarts.error_yaml_parse', {
        error: formatEChartsErrorMessage(err, t('views.echarts.error_unknown')),
      }),
    }
  }
}

/**
 * Parses a YAML string or plain object `echartsOption`, serializes the Bases dataset,
 * and injects it at the `id: 'bases'` slot.
 */
export function resolveEChartsOptionState(
  rawOption: unknown,
  entries: readonly BasesDatasetEntryLike[],
  properties: readonly BasesPropertyId[],
  parseYamlFn: (yaml: string) => unknown = parseYaml,
): ResolveEChartsOptionResult {
  if (rawOption === undefined || rawOption === null) {
    return { state: { kind: 'empty' }, option: null }
  }

  if (typeof rawOption === 'string' && isEmptyYamlOption(rawOption)) {
    return { state: { kind: 'empty' }, option: null }
  }

  const parsedResult =
    typeof rawOption === 'string'
      ? parseRawOption(rawOption, parseYamlFn)
      : { ok: true as const, value: rawOption }

  if (!parsedResult.ok) {
    return {
      state: { kind: 'error', message: parsedResult.error },
      option: null,
    }
  }

  const parsedValue = parsedResult.value

  if (!isRecord(parsedValue) || Array.isArray(parsedValue)) {
    return {
      state: {
        kind: 'error',
        message: t('views.echarts.error_invalid_root'),
      },
      option: null,
    }
  }

  const basesDataset = serializeBasesDataset(entries, properties)
  const injected = injectBasesDataset(parsedValue, basesDataset)
  if (!injected.ok) {
    return {
      state: {
        kind: 'error',
        message: t('views.echarts.error_dataset', { error: injected.error }),
      },
      option: null,
    }
  }

  return { state: { kind: 'ready' }, option: injected.option }
}

export class EChartsView extends BaseChartView {
  readonly type = 'echarts'
  private readonly statusEl: HTMLElement
  private viewState: EChartsViewState = { kind: 'empty' }

  constructor(
    controller: Readonly<QueryController>,
    scrollEl: Readonly<HTMLElement>,
    plugin: Readonly<BarePlugin>,
  ) {
    super(controller, scrollEl, plugin)
    this.statusEl = this.containerEl.createDiv({ cls: 'bases-echarts-prompt bases-echarts-hidden' })
  }

  protected override getInteractivityData(): BasesData | undefined {
    return undefined
  }

  protected getChartOption(_data: BasesData): EChartsOption | null {
    return null
  }

  protected override resolveChartOption(_data: BasesData): EChartsOption | null {
    if (!this.data) {
      this.viewState = { kind: 'empty' }
      return null
    }

    const properties = mergeOrderedProperties(this.data.properties ?? [], this.allProperties ?? [])
    const result = resolveEChartsOptionState(
      this.config.get(BaseChartView.ECHARTS_OPTION_KEY),
      this.data.data ?? [],
      properties,
    )
    this.viewState = result.state
    return result.option
  }

  protected override applyResolvedChartOption(option: EChartsOption | null): void {
    if (option) {
      this.hideStatus()
      this.chartEl.classList.remove('bases-echarts-hidden')
      try {
        this.ensureChart().setOption(option, true)
      } catch (err: unknown) {
        this.chart?.dispose()
        this.chart = null
        this.showError(
          t('views.echarts.error_render', {
            error: formatEChartsErrorMessage(err, t('views.echarts.error_unknown')),
          }),
        )
      }
      return
    }

    this.chart?.dispose()
    this.chart = null
    if (this.viewState.kind === 'error') {
      this.showError(this.viewState.message)
      return
    }

    this.showPrompt()
  }

  private hideStatus(): void {
    this.statusEl.classList.add('bases-echarts-hidden')
    this.statusEl.setText('')
  }

  private showPrompt(): void {
    this.chartEl.classList.add('bases-echarts-hidden')
    this.statusEl.classList.remove('bases-echarts-hidden', 'bases-echarts-error')
    this.statusEl.classList.add('bases-echarts-prompt')
    this.statusEl.setText(t('views.echarts.empty_option_prompt'))
  }

  private showError(message: string): void {
    this.chartEl.classList.add('bases-echarts-hidden')
    this.statusEl.classList.remove('bases-echarts-hidden', 'bases-echarts-prompt')
    this.statusEl.classList.add('bases-echarts-error')
    this.statusEl.setText(message)
  }

  static getViewOptions(plugin?: BarePlugin): BasesOptions[] {
    return [
      {
        displayName: t('views.echarts.option_label'),
        type: 'text',
        key: BaseChartView.ECHARTS_OPTION_KEY,
        placeholder: t('views.echarts.option_placeholder'),
      },
      ...BaseChartView.getHostViewOptions(plugin),
    ]
  }
}
