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
  upColor: '#14b143',
  downColor: '#ef232a',
  mySetting: 'default',
  defaultHeight: '100%',
  customThemes: [],
  selectedTheme: '',
}
