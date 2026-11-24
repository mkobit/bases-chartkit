import { Notice, Plugin } from 'obsidian'
import * as echarts from 'echarts'
import type { BarePluginSettings } from './settings'
import { DEFAULT_SETTINGS, SettingTab } from './settings'
import { initializeI18n } from './lang/i18n'
import { t } from './lang/text'
import { partitionCustomThemes } from './charts/obsidian-theme'
import type { BaseChartView } from './views/base-chart-view'
import { ActiveChartRegistry, registerChartCommands } from './views/chart-commands'
import { registerChartViews } from './views/register-views'

export default class BarePlugin extends Plugin {
  public settings: BarePluginSettings = DEFAULT_SETTINGS
  public readonly activeCharts = new ActiveChartRegistry()

  public registerChartView(view: BaseChartView): void {
    this.activeCharts.register(view)
  }

  public unregisterChartView(view: BaseChartView): void {
    this.activeCharts.unregister(view)
  }

  public setActiveChartView(view: BaseChartView): void {
    this.activeCharts.setActive(view)
  }

  public getActiveChartView(): BaseChartView | null {
    return this.activeCharts.getActive(this.app)
  }

  async onload() {
    await this.loadSettings()
    this.applyTheme()
    await initializeI18n()
    this.registerHoverLinkSource('bases-chartkit', {
      display: this.manifest.name,
      defaultMod: true,
    })

    registerChartCommands(this)
    registerChartViews(this)

    this.addSettingTab(new SettingTab(this.app, this))
  }

  onunload() {}

  async loadSettings() {
    // Obsidian's loadData() is typed Promise<any> -- no cast needed to feed it
    // into Object.assign, whose result already collapses to `any` once one of
    // its sources is `any`, and `any` is assignable to `this.settings` as-is.
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.applyTheme()
  }

  applyTheme() {
    const { valid, invalidNames } = partitionCustomThemes(this.settings.customThemes)
    valid.forEach(({ name, theme }) => {
      echarts.registerTheme(name, theme)
    })
    invalidNames.forEach(name => {
      new Notice(t('settings.custom_themes.parse_error', { name }))
    })
  }
}
