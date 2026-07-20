import i18next from 'i18next'
import en from './locales/en.json'

// eslint-disable-next-line functional/functional-parameters -- i18next.init's callback-style overload isn't used; this is a plain async function with no parameters to flag
export async function initializeI18n(): Promise<void> {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: en,
      },
    },
  })
}
