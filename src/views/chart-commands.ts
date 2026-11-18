import type { App } from 'obsidian'
import { View } from 'obsidian'
import type BarePlugin from '../main'
import { t } from '../lang/text'
import type { BaseChartView } from './base-chart-view'

/**
 * Tracks mounted chart views and resolves the active view for plugin commands.
 */
export class ActiveChartRegistry {
  private readonly chartViews = new Set<BaseChartView>()
  private activeChartView: BaseChartView | null = null

  public register(view: BaseChartView): void {
    this.chartViews.add(view)
  }

  public unregister(view: BaseChartView): void {
    this.chartViews.delete(view)
    if (this.activeChartView === view) {
      this.activeChartView = null
    }
  }

  public setActive(view: BaseChartView): void {
    this.activeChartView = view
  }

  public getActive(app: App): BaseChartView | null {
    const activeView = app.workspace.getActiveViewOfType(View)
    const activeLeafContainer = activeView?.containerEl
    if (activeLeafContainer) {
      if (this.activeChartView && activeLeafContainer.contains(this.activeChartView.containerEl)) {
        return this.activeChartView
      }
      const matchInActiveLeaf = Array.from(this.chartViews).find(view =>
        activeLeafContainer.contains(view.containerEl),
      )
      if (matchInActiveLeaf) {
        return matchInActiveLeaf
      }
    }
    if (this.activeChartView && this.chartViews.has(this.activeChartView)) {
      return this.activeChartView
    }
    if (this.chartViews.size === 1) {
      return this.chartViews.values().next().value ?? null
    }
    return null
  }
}

export function registerChartCommands(plugin: BarePlugin): void {
  plugin.addCommand({
    id: 'open-active-chart-fullscreen',
    name: t('commands.open_fullscreen_chart'),
    checkCallback: (checking: boolean) => {
      const activeView = plugin.getActiveChartView()
      if (!activeView) {
        return false
      }
      if (!checking) {
        activeView.openFullScreen()
      }
      return true
    },
  })
}
