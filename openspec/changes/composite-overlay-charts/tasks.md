## 1. Transformer Implementation

- [x] 1.1 Implement `createComboChartOption` in `src/charts/transformers/combo.ts` supporting primary series, overlay series, dual y-axis, and grouping
- [x] 1.2 Export combo transformer from `src/charts/transformer.ts` and add unit tests in `tests/charts/transformers/combo.test.ts` verifying option output

## 2. View Implementation & Registration

- [x] 2.1 Implement `ComboChartView` in `src/views/combo-chart-view.ts` with Bases configuration options
- [x] 2.2 Register `combo-chart` in `src/charts/registered-views.ts`, `src/main.ts`, and add localization strings in `src/lang/locales/en.json`

## 3. Verification

- [x] 3.1 Run `mise run check` to verify TypeScript, ESLint, budgets, OpenSpec validation, and unit tests
