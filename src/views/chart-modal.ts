import type { App } from 'obsidian'
import { Modal } from 'obsidian'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export class ChartModal extends Modal {
  private chart: echarts.ECharts | null = null
  private readonly option: EChartsOption
  private readonly theme?: string

  constructor(app: App, option: EChartsOption, theme?: string) {
    super(app)
    this.option = option
    this.theme = theme
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    contentEl.addClass('bases-chart-modal')

    const chartContainer = contentEl.createDiv({ cls: 'bases-echarts-container' })
    const chartEl = chartContainer.createDiv({ cls: 'bases-echarts' })

    // Wait for layout paint
    window.requestAnimationFrame(() => {
      this.chart = echarts.init(chartEl, this.theme)
      this.chart.setOption(this.option)

      activeWindow.addEventListener('resize', this.handleResize)
    })
  }

  onClose() {
    activeWindow.removeEventListener('resize', this.handleResize)
    this.chart?.dispose()
    this.chart = null
    this.contentEl.empty()
  }

  private handleResize = () => {
    this.chart?.resize()
  }
}
