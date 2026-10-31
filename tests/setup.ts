import { Temporal } from '@js-temporal/polyfill'

// Ensure Temporal is available globally
if (typeof (globalThis as any).Temporal === 'undefined') {
  // eslint-disable-next-line functional/immutable-data -- Polyfill Temporal for test environment
  ;(globalThis as any).Temporal = Temporal
}
