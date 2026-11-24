import 'i18next'
import type en from '../lang/locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    readonly defaultNS: 'translation'
    readonly resources: {
      readonly translation: typeof en
    }
  }
}
