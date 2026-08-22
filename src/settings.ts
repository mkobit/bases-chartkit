import type { App, Setting, SettingDefinitionItem } from 'obsidian'
import { Notice, PluginSettingTab } from 'obsidian'
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
  defaultHeight: '100%',
  customThemes: [],
  selectedTheme: '',
}

export class SettingTab extends PluginSettingTab {
  plugin: BarePlugin
  private newThemeName = ''
  private newThemeJson = ''

  constructor(app: Readonly<App>, plugin: Readonly<BarePlugin>) {
    super(
      app,
      plugin,
    )
    this.plugin = plugin
  }

  override getControlValue(key: string): unknown {
    if (key === 'defaultHeight') {
      return this.plugin.settings.defaultHeight
    }
    if (key === 'upColor') {
      return this.plugin.settings.upColor
    }
    if (key === 'downColor') {
      return this.plugin.settings.downColor
    }
    if (key === 'selectedTheme') {
      return this.plugin.settings.selectedTheme
    }
    if (key === 'mySetting') {
      return this.plugin.settings.mySetting
    }
    return undefined
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (typeof value === 'string') {
      switch (key) {
        case 'defaultHeight': {
          this.plugin.settings.defaultHeight = value
          break
        }
        case 'upColor': {
          this.plugin.settings.upColor = value
          break
        }
        case 'downColor': {
          this.plugin.settings.downColor = value
          break
        }
        case 'selectedTheme': {
          this.plugin.settings.selectedTheme = value
          break
        }
        case 'mySetting': {
          this.plugin.settings.mySetting = value
          break
        }
        default: {
          break
        }
      }
    }
    await this.plugin.saveSettings()
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: t('settings.default_height.name'),
        desc: t('settings.default_height.desc'),
        control: {
          type: 'text',
          key: 'defaultHeight',
          placeholder: t('settings.default_height.placeholder'),
        },
      },
      {
        name: t('settings.up_color.name'),
        desc: t('settings.up_color.desc'),
        control: {
          type: 'text',
          key: 'upColor',
          placeholder: t('settings.up_color.placeholder'),
        },
      },
      {
        name: t('settings.down_color.name'),
        desc: t('settings.down_color.desc'),
        control: {
          type: 'text',
          key: 'downColor',
          placeholder: t('settings.down_color.placeholder'),
        },
      },
      {
        name: t('settings.global_theme.name'),
        desc: t('settings.global_theme.desc'),
        control: {
          type: 'dropdown',
          key: 'selectedTheme',
          options: {
            '': t('settings.global_theme.default_option'),
            ...Object.fromEntries(
              this.plugin.settings.customThemes.map(theme => [theme.name, theme.name]),
            ),
          },
        },
      },
      {
        type: 'group',
        heading: t('settings.custom_themes.title'),
        items: this.plugin.settings.customThemes.map((theme, index) => ({
          name: theme.name,
          desc: t('settings.custom_themes.desc'),
          render: (setting: Setting) => {
            setting.addExtraButton(button => button
              .setIcon('trash')
              .setTooltip(t('settings.custom_themes.delete_tooltip'))
              .onClick(async () => {
                this.plugin.settings.customThemes.splice(index, 1)
                if (this.plugin.settings.selectedTheme === theme.name) {
                  this.plugin.settings.selectedTheme = ''
                }
                await this.plugin.saveSettings()
                this.update()
              }))
          },
        })),
      },
      {
        type: 'group',
        heading: t('settings.add_theme.title'),
        items: [
          {
            name: t('settings.add_theme.name_label'),
            render: (setting: Setting) => {
              setting.addText(text => text
                .setPlaceholder(t('settings.add_theme.name_placeholder'))
                .setValue(this.newThemeName)
                .onChange((value) => {
                  this.newThemeName = value
                }))
            },
          },
          {
            name: t('settings.add_theme.json_label'),
            desc: t('settings.add_theme.json_desc'),
            render: (setting: Setting) => {
              setting.addTextArea(text => text
                .setPlaceholder(t('settings.add_theme.json_placeholder'))
                .setValue(this.newThemeJson)
                .onChange((value) => {
                  this.newThemeJson = value
                }))
            },
          },
          {
            name: '',
            render: (setting: Setting) => {
              setting.addButton(button => button
                .setButtonText(t('settings.add_theme.button'))
                .setCta()
                .onClick(async () => {
                  if (!this.newThemeName.trim() || !this.newThemeJson.trim()) {
                    new Notice(t('settings.add_theme.missing_fields_error'))
                    return
                  }

                  if (this.plugin.settings.customThemes.some(t => t.name === this.newThemeName.trim())) {
                    new Notice(t('settings.add_theme.exists_error'))
                    return
                  }

                  if (!validateTheme(this.newThemeJson)) {
                    new Notice(t('settings.add_theme.invalid_json_error'))
                    return
                  }

                  this.plugin.settings.customThemes.push({
                    name: this.newThemeName.trim(),
                    json: this.newThemeJson.trim(),
                  })
                  this.newThemeName = ''
                  this.newThemeJson = ''
                  await this.plugin.saveSettings()
                  new Notice(t('settings.add_theme.success'))
                  this.update()
                }))
            },
          },
        ],
      },
    ]
  }
}
