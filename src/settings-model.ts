import { COLOR_TOKENS } from './charts/transformers/tokens'

export interface CustomTheme {
  readonly name: string
  readonly json: string
}

export interface BarePluginSettings {
  readonly upColor: string
  readonly downColor: string
  readonly mySetting: string
  readonly defaultHeight: string
  readonly customThemes: ReadonlyArray<CustomTheme>
  readonly selectedTheme: string
}

export const DEFAULT_SETTINGS: BarePluginSettings = {
  upColor: COLOR_TOKENS.status.up,
  downColor: COLOR_TOKENS.status.down,
  mySetting: 'default',
  defaultHeight: '100%',
  customThemes: [],
  selectedTheme: '',
}
