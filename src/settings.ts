import type { App } from 'obsidian'
import { PluginSettingTab, Setting, Notice } from 'obsidian'
import { t } from './lang/text'
import type BarePlugin from './main'
import { validateTheme } from './theme-validation'

export interface CustomTheme {
  name: string
  json: string
}

export interface BarePluginSettings {
  upColor: string
  downColor: string
  mySetting: string
  defaultHeight: string
  customThemes: CustomTheme[]
  selectedTheme: string
}

export const DEFAULT_SETTINGS: BarePluginSettings = {
  upColor: '#14b143',
  downColor: '#ef232a',
  mySetting: 'default',
  defaultHeight: '500px',
  customThemes: [],
  selectedTheme: '',
}

export class SettingTab extends PluginSettingTab {
  plugin: BarePlugin

  constructor(app: Readonly<App>, plugin: Readonly<BarePlugin>) {
    super(
      app,
      plugin,
    )
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName(t('settings.default_height.name'))
      .setDesc(t('settings.default_height.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.default_height.placeholder'))
        .setValue(this.plugin.settings.defaultHeight)
        .onChange(async (value) => {
          this.plugin.settings.defaultHeight = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName(t('settings.up_color.name'))
      .setDesc(t('settings.up_color.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.up_color.placeholder'))
        .setValue(this.plugin.settings.upColor)
        .onChange(async (value) => {
          this.plugin.settings.upColor = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName(t('settings.down_color.name'))
      .setDesc(t('settings.down_color.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.down_color.placeholder'))
        .setValue(this.plugin.settings.downColor)
        .onChange(async (value) => {
          this.plugin.settings.downColor = value
          await this.plugin.saveSettings()
        }))

    // Global Theme Selection
    new Setting(containerEl)
      .setName(t('settings.global_theme.name'))
      .setDesc(t('settings.global_theme.desc'))
      .addDropdown((dropdown) => {
        dropdown.addOption('', t('settings.global_theme.default_option'))
        this.plugin.settings.customThemes.forEach((theme) => {
          dropdown.addOption(theme.name, theme.name)
        })
        dropdown.setValue(this.plugin.settings.selectedTheme)
        dropdown.onChange(async (value) => {
          this.plugin.settings.selectedTheme = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl).setName(t('settings.custom_themes.title')).setHeading()

    // List existing custom themes
    this.plugin.settings.customThemes.forEach((theme, index) => {
      new Setting(containerEl)
        .setName(theme.name)
        .setDesc(t('settings.custom_themes.desc'))
        .addExtraButton(button => button
          .setIcon('trash')
          .setTooltip(t('settings.custom_themes.delete_tooltip'))
          .onClick(async () => {
            this.plugin.settings.customThemes.splice(index, 1)
            if (this.plugin.settings.selectedTheme === theme.name) {
              this.plugin.settings.selectedTheme = ''
            }
            await this.plugin.saveSettings()
            this.display()
          }))
    })

    // Add New Theme Section
    new Setting(containerEl).setName(t('settings.add_theme.title')).setHeading()

    const newThemeState = { name: '',
      json: '' }

    new Setting(containerEl)
      .setName(t('settings.add_theme.name_label'))
      .addText(text => text
        .setPlaceholder(t('settings.add_theme.name_placeholder'))
        .onChange((value) => {
          newThemeState.name = value
        }))

    new Setting(containerEl)
      .setName(t('settings.add_theme.json_label'))
      .setDesc(t('settings.add_theme.json_desc'))
      .addTextArea(text => text
        .setPlaceholder(t('settings.add_theme.json_placeholder'))
        .onChange((value) => {
          newThemeState.json = value
        }))

    new Setting(containerEl)
      .addButton(button => button
        .setButtonText(t('settings.add_theme.button'))
        .setCta()
        .onClick(async () => {
          if (!newThemeState.name.trim() || !newThemeState.json.trim()) {
            new Notice(t('settings.add_theme.missing_fields_error'))
            return
          }

          if (this.plugin.settings.customThemes.some(t => t.name === newThemeState.name)) {
            new Notice(t('settings.add_theme.exists_error'))
            return
          }

          if (!validateTheme(newThemeState.json)) {
            new Notice(t('settings.add_theme.invalid_json_error'))
            return
          }

          this.plugin.settings.customThemes.push({
            name: newThemeState.name.trim(),
            json: newThemeState.json.trim(),
          })
          await this.plugin.saveSettings()
          new Notice(t('settings.add_theme.success'))
          this.display() // Refresh to show in list and dropdown
        }))
  }
}
