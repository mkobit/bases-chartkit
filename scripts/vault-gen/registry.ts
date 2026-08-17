import { Temporal } from 'temporal-polyfill'
import { barChartArbitrary, stackedBarChartArbitrary } from '../generators/bar'
import { bulletChartArbitrary } from '../generators/bullet'
import { boxplotChartArbitrary, histogramChartArbitrary, paretoChartArbitrary, waterfallChartArbitrary } from '../generators/distribution'
import { candlestickChartArbitrary } from '../generators/financial'
import { graphChartArbitrary, linesChartArbitrary, sankeyChartArbitrary } from '../generators/flow'
import { funnelChartArbitrary, gaugeChartArbitrary } from '../generators/funnel'
import { ganttChartArbitrary } from '../generators/gantt'
import { calendarChartArbitrary, heatmapChartArbitrary } from '../generators/heatmap'
import { sunburstChartArbitrary, treeChartArbitrary, treemapChartArbitrary } from '../generators/hierarchy'
import { lineChartArbitrary, stackedAreaChartArbitrary } from '../generators/line'
import { pieChartArbitrary } from '../generators/pie'
import { polarLineChartArbitrary } from '../generators/polar'
import { radarChartArbitrary } from '../generators/radar'
import { bubbleChartArbitrary } from '../generators/bubble'
import { demographicScatterArbitrary } from '../generators/scatter'
import { mapChartArbitrary } from '../generators/map'
import { themeRiverChartArbitrary } from '../generators/theme-river'
import { wordCloudChartArbitrary } from '../generators/word-cloud'
import { defineChartExampleSpec } from './spec'
import type { ChartExampleSpec } from './spec'

interface BarSample {
  readonly data: ReadonlyArray<{ readonly category: string, readonly value: number }>
}

const barSpec = defineChartExampleSpec<BarSample>({
  chartType: 'bar',
  description: 'Department spend, ranked -- demonstrates a basic bar chart.',
  arbitrary: barChartArbitrary,
  notePrefix: 'Dept-Spend',
  toRows: sample => sample.data.map(row => ({
    Department: row.category,
    Spend: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Department spend',
      viewType: 'bar-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Department spend (vintage theme)',
      viewType: 'bar-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      fileName: 'FlippedAxis.base',
      viewName: 'Department spend (flipped axis)',
      viewType: 'bar-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      literalOptions: { showLegend: true, flipAxis: true },
    },
  ],
})

const pictorialBarSpec = defineChartExampleSpec<BarSample>({
  chartType: 'pictorial-bar',
  description: 'Department spend, ranked -- demonstrates a pictorial bar chart with a custom symbol.',
  arbitrary: barChartArbitrary,
  notePrefix: 'Dept-Spend',
  toRows: sample => sample.data.map(row => ({
    Department: row.category,
    Spend: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Department spend (pictorial bar)',
      viewType: 'pictorial-bar-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      literalOptions: { showLegend: true, symbol: 'rect' },
    },
  ],
})

const radialBarSpec = defineChartExampleSpec<BarSample>({
  chartType: 'radial-bar',
  description: 'Department spend, ranked -- demonstrates a radial bar chart.',
  arbitrary: barChartArbitrary,
  notePrefix: 'Dept-Spend',
  toRows: sample => sample.data.map(row => ({
    Department: row.category,
    Spend: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Department spend (radial bar)',
      viewType: 'radial-bar-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

const roseSpec = defineChartExampleSpec<BarSample>({
  chartType: 'rose',
  description: 'Department spend, ranked -- demonstrates a rose chart.',
  arbitrary: barChartArbitrary,
  notePrefix: 'Dept-Spend',
  toRows: sample => sample.data.map(row => ({
    Department: row.category,
    Spend: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Department spend (rose)',
      viewType: 'rose-chart',
      propBindings: {
        xAxisProp: 'note.Department',
        yAxisProp: 'note.Spend',
      },
      // legendPosition/legendOrient regression coverage (bck-bjg): rose
      // dropped these until it started spreading getCommonTransformerOptions().
      literalOptions: { showLegend: true, legendPosition: 'right' },
    },
  ],
})

interface StackedBarSample {
  readonly data: ReadonlyArray<{ readonly quarter: string, readonly region: string, readonly revenue: number }>
}

const stackedBarSpec = defineChartExampleSpec<StackedBarSample>({
  chartType: 'stacked-bar',
  description: 'Quarterly revenue by region -- demonstrates a stacked bar chart with multiple series.',
  arbitrary: stackedBarChartArbitrary,
  notePrefix: 'Quarterly-Revenue',
  toRows: sample => sample.data.map(row => ({
    Quarter: row.quarter,
    Region: row.region,
    Revenue: row.revenue,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Revenue by quarter (stacked)',
      viewType: 'stacked-bar-chart',
      propBindings: {
        xAxisProp: 'note.Quarter',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface LineSample {
  readonly data: ReadonlyArray<{ readonly date: string, readonly value: number }>
}

const lineSpec = defineChartExampleSpec<LineSample>({
  chartType: 'line',
  description: 'Daily revenue trend -- demonstrates a basic line chart.',
  arbitrary: lineChartArbitrary,
  notePrefix: 'Revenue',
  toRows: sample => sample.data.map(row => ({
    Date: Temporal.PlainDate.from(row.date),
    Revenue: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Revenue trend',
      viewType: 'line-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true },
    },
    {
      // line-unique option combo: smooth the daily random walk into a curve
      // and drop the per-point symbols so the trend reads as one continuous
      // line -- neither toggle exists on the categorical bar path.
      fileName: 'Basic.base',
      viewName: 'Revenue trend (smoothed)',
      viewType: 'line-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true, smooth: true, showSymbol: false },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Revenue trend (vintage theme)',
      viewType: 'line-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      fileName: 'FlippedAxis.base',
      viewName: 'Revenue trend (flipped axis)',
      viewType: 'line-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true, flipAxis: true },
    },
    {
      fileName: 'Formula.base',
      viewName: 'Revenue trend (formatted dates)',
      viewType: 'line-chart',
      // Mirrors area/Formula.base (bck-g79): line is the simplest cartesian to
      // showcase a `formula.*`-bound x-axis. The raw ISO Date is pre-formatted
      // into "Month DD, YYYY" by a Bases-native formula upstream rather than a
      // chart-side format option, and the category axis plots the resulting
      // string. If the formula id didn't flow through getNestedValue, the
      // categories would render as raw ISO dates or 'Unknown'.
      formulas: { FormattedDate: 'Date.format("MMMM DD, YYYY")' },
      propBindings: {
        xAxisProp: 'formula.FormattedDate',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface RadarSample {
  readonly data: ReadonlyArray<{
    readonly name: string
    readonly class: string
    readonly Strength: number
    readonly Intelligence: number
    readonly Agility: number
    readonly Wisdom: number
    readonly Charisma: number
  }>
}

const radarSpec = defineChartExampleSpec<RadarSample>({
  chartType: 'radar',
  description: 'Character attribute comparison -- demonstrates a radar chart with multiple series.',
  arbitrary: radarChartArbitrary,
  notePrefix: 'Character',
  toRows: sample => sample.data.map(row => ({
    Name: row.name,
    Class: row.class,
    Strength: row.Strength,
    Intelligence: row.Intelligence,
    Agility: row.Agility,
    Wisdom: row.Wisdom,
    Charisma: row.Charisma,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Character stats radar',
      viewType: 'radar-chart',
      propBindings: {
        xAxisProp: 'note.Name',
        metricProps: 'note.Strength, note.Intelligence, note.Agility',
      },
      literalOptions: { showLegend: true },
      filters: ['note.Class != null'],
    },
  ],
})

// Reuses radarChartArbitrary/RadarSample as-is -- parallel-coordinates and
// radar plot the exact same wide-format character rows (name/class/
// Strength/Intelligence/Agility), just bound differently: xProp takes the
// same comma-separated multi-property convention as radar's metricProps,
// and seriesProp groups by Class instead of radar's per-name xAxisProp.
// No new data-generation logic needed.
const parallelSpec = defineChartExampleSpec<RadarSample>({
  chartType: 'parallel',
  description: 'Character attribute comparison grouped by class -- demonstrates a parallel-coordinates chart, reusing radarChartArbitrary.',
  arbitrary: radarChartArbitrary,
  notePrefix: 'Character',
  toRows: sample => sample.data.map(row => ({
    Name: row.name,
    Class: row.class,
    Strength: row.Strength,
    Intelligence: row.Intelligence,
    Agility: row.Agility,
    Wisdom: row.Wisdom,
    Charisma: row.Charisma,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Character stats (parallel)',
      viewType: 'parallel-chart',
      propBindings: {
        xProp: 'note.Strength, note.Intelligence, note.Agility',
        seriesProp: 'note.Class',
      },
      literalOptions: { showLegend: true },
      filters: ['note.Class != null'],
    },
  ],
})

interface BoxplotSample {
  readonly data: ReadonlyArray<{ readonly category: string, readonly value: number }>
}

const boxplotSpec = defineChartExampleSpec<BoxplotSample>({
  chartType: 'boxplot',
  description: 'Product score distribution -- demonstrates a boxplot chart.',
  arbitrary: boxplotChartArbitrary,
  notePrefix: 'Product-Score',
  toRows: sample => sample.data.map(row => ({
    Product: row.category,
    Score: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Product score distribution',
      viewType: 'boxplot-chart',
      propBindings: {
        xAxisProp: 'note.Product',
        yAxisProp: 'note.Score',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface HistogramSample {
  readonly data: ReadonlyArray<{ readonly value: number }>
}

const histogramSpec = defineChartExampleSpec<HistogramSample>({
  chartType: 'histogram',
  description: 'Score distribution -- demonstrates a histogram chart.',
  arbitrary: histogramChartArbitrary,
  notePrefix: 'Score',
  toRows: sample => sample.data.map(row => ({
    Score: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Score distribution',
      viewType: 'histogram-chart',
      propBindings: {
        valueProp: 'note.Score',
      },
    },
  ],
})

interface ParetoSample {
  readonly data: ReadonlyArray<{ readonly name: string, readonly value: number }>
}

const paretoSpec = defineChartExampleSpec<ParetoSample>({
  chartType: 'pareto',
  description: 'Product sales, ranked -- demonstrates a pareto chart.',
  arbitrary: paretoChartArbitrary,
  notePrefix: 'Product-Sales',
  toRows: sample => sample.data.map(row => ({
    Product: row.name,
    Sales: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Product sales (pareto)',
      viewType: 'pareto-chart',
      propBindings: {
        xAxisProp: 'note.Product',
        yAxisProp: 'note.Sales',
      },
    },
  ],
})

interface WaterfallSample {
  readonly data: ReadonlyArray<{ readonly step: string, readonly value: number, readonly isTotal: boolean }>
}

const waterfallSpec = defineChartExampleSpec<WaterfallSample>({
  chartType: 'waterfall',
  description: 'Budget waterfall -- demonstrates a waterfall chart with connector lines and absolute-total bars.',
  arbitrary: waterfallChartArbitrary,
  notePrefix: 'Budget-Step',
  toRows: sample => sample.data.map(row => ({
    Step: row.step,
    Change: row.value,
    IsTotal: row.isTotal,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Budget waterfall',
      viewType: 'waterfall-chart',
      propBindings: {
        xAxisProp: 'note.Step',
        yAxisProp: 'note.Change',
        totalProp: 'note.IsTotal',
      },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Budget waterfall (vintage theme)',
      viewType: 'waterfall-chart',
      propBindings: {
        xAxisProp: 'note.Step',
        yAxisProp: 'note.Change',
        totalProp: 'note.IsTotal',
      },
      literalOptions: { theme: 'Vintage' },
    },
    {
      // No totalProp: every row is treated as a delta, so the same notes render
      // without the absolute-total bars -- shows what the totalProp toggle
      // changes (the opening/closing balance steps become plain deltas).
      fileName: 'DeltasOnly.base',
      viewName: 'Budget waterfall (deltas only)',
      viewType: 'waterfall-chart',
      propBindings: {
        xAxisProp: 'note.Step',
        yAxisProp: 'note.Change',
      },
    },
  ],
})

interface SankeySample {
  readonly data: ReadonlyArray<{ readonly source: string, readonly target: string, readonly users: number }>
}

const sankeySpec = defineChartExampleSpec<SankeySample>({
  chartType: 'sankey',
  description: 'User funnel flow -- demonstrates a sankey chart.',
  arbitrary: sankeyChartArbitrary,
  notePrefix: 'Funnel-Step',
  toRows: sample => sample.data.map(row => ({
    Source: row.source,
    Target: row.target,
    Amount: row.users,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'User funnel flow (sankey)',
      viewType: 'sankey-chart',
      propBindings: {
        xAxisProp: 'note.Source',
        yAxisProp: 'note.Target',
        valueProp: 'note.Amount',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface GraphSample {
  readonly data: ReadonlyArray<{ readonly source: string, readonly target: string, readonly traffic: number, readonly zone: string }>
}

const graphSpec = defineChartExampleSpec<GraphSample>({
  chartType: 'graph',
  description: 'Network topology -- demonstrates a graph chart.',
  arbitrary: graphChartArbitrary,
  notePrefix: 'Network-Link',
  toRows: sample => sample.data.map(row => ({
    Source: row.source,
    Target: row.target,
    Amount: row.traffic,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Network topology (graph)',
      viewType: 'graph-chart',
      propBindings: {
        sourceProp: 'note.Source',
        targetProp: 'note.Target',
        valueProp: 'note.Amount',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface LinesSample {
  readonly data: ReadonlyArray<{ readonly start_x: number, readonly start_y: number, readonly end_x: number, readonly end_y: number }>
}

const linesSpec = defineChartExampleSpec<LinesSample>({
  chartType: 'lines',
  description: 'Route lines -- demonstrates a lines chart with start/end coordinate pairs.',
  arbitrary: linesChartArbitrary,
  notePrefix: 'Route',
  // linesChartArbitrary's data domain is pure coordinates -- no category
  // field. Route type is derived here (not sampled) from each line's own
  // direction, so it stays deterministic without adding new randomness:
  // "Outbound" for a line moving rightward, "Return" otherwise.
  toRows: sample => sample.data.map(row => ({
    StartX: row.start_x,
    StartY: row.start_y,
    EndX: row.end_x,
    EndY: row.end_y,
    RouteType: row.end_x >= row.start_x ? 'Outbound' : 'Return',
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Route lines',
      viewType: 'lines-chart',
      propBindings: {
        xAxisProp: 'note.StartX',
        yAxisProp: 'note.StartY',
        end_x_prop: 'note.EndX',
        end_y_prop: 'note.EndY',
        seriesProp: 'note.RouteType',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface HierarchySample {
  readonly data: ReadonlyArray<{ readonly path: string, readonly employees: number }>
}

const treeSpec = defineChartExampleSpec<HierarchySample>({
  chartType: 'tree',
  description: 'Company org chart -- demonstrates a tree chart over hierarchical, slash-delimited path data.',
  arbitrary: treeChartArbitrary,
  notePrefix: 'Org-Node',
  toRows: sample => sample.data.map(row => ({
    Path: row.path,
    Value: row.employees,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Project tasks tree',
      viewType: 'tree-chart',
      propBindings: {
        xAxisProp: 'note.Path',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

const sunburstSpec = defineChartExampleSpec<HierarchySample>({
  chartType: 'sunburst',
  description: 'Company org chart -- demonstrates a sunburst chart over hierarchical, slash-delimited path data.',
  arbitrary: sunburstChartArbitrary,
  notePrefix: 'Org-Node',
  toRows: sample => sample.data.map(row => ({
    Path: row.path,
    Value: row.employees,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Project tasks sunburst',
      viewType: 'sunburst-chart',
      propBindings: {
        xAxisProp: 'note.Path',
        valueProp: 'note.Value',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

const treemapSpec = defineChartExampleSpec<HierarchySample>({
  chartType: 'treemap',
  description: 'Org headcount by division -- demonstrates a treemap over multi-root, slash-delimited hierarchical path data with area-proportional leaves.',
  arbitrary: treemapChartArbitrary,
  notePrefix: 'Org-Node',
  toRows: sample => sample.data.map(row => ({
    Path: row.path,
    Value: row.employees,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Org headcount treemap',
      viewType: 'treemap-chart',
      propBindings: {
        xAxisProp: 'note.Path',
        valueProp: 'note.Value',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Org headcount treemap (vintage theme)',
      viewType: 'treemap-chart',
      propBindings: {
        xAxisProp: 'note.Path',
        valueProp: 'note.Value',
      },
      literalOptions: { showLegend: true,
        theme: 'Vintage' },
    },
  ],
})

interface ScatterWithSeriesSample {
  readonly data: ReadonlyArray<{
    readonly x: number
    readonly y: number
    readonly continent: string
    readonly population: number
  }>
}

const scatterSpec = defineChartExampleSpec<ScatterWithSeriesSample>({
  chartType: 'scatter',
  description: 'GDP vs life expectancy by continent -- demonstrates a scatter chart with a categorical series.',
  arbitrary: demographicScatterArbitrary,
  notePrefix: 'Country',
  toRows: sample => sample.data.map(row => ({
    GDP: row.x,
    LifeExpectancy: row.y,
    Continent: row.continent,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'GDP vs life expectancy',
      viewType: 'scatter-chart',
      propBindings: {
        xAxisProp: 'note.GDP',
        yAxisProp: 'note.LifeExpectancy',
        seriesProp: 'note.Continent',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface BubblePointSample {
  readonly data: ReadonlyArray<{ readonly x: number, readonly y: number, readonly size: number }>
}

const bubbleSpec = defineChartExampleSpec<BubblePointSample>({
  chartType: 'bubble',
  description: 'Weighted point cloud -- demonstrates a bubble chart with size-encoded points.',
  arbitrary: bubbleChartArbitrary,
  notePrefix: 'Point',
  toRows: sample => sample.data.map(row => ({
    PointX: row.x,
    PointY: row.y,
    Weight: row.size,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Weighted point cloud (bubble)',
      viewType: 'bubble-chart',
      propBindings: {
        xAxisProp: 'note.PointX',
        yAxisProp: 'note.PointY',
        sizeProp: 'note.Weight',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

// effect-scatter-chart-view.ts (see src/views/effect-scatter-chart-view.ts)
// passes sizeProp's raw value straight through as pixel symbolSize, unlike
// scatter.ts's bubble mode which normalizes via visualMap -- open bug
// bck-ma9. This spec ships TWO variants sharing the same generated notes:
// Basic.base (safe, no sizeProp -- the one to use in docs/screenshots) and
// Sized-By-Population.base (sizeProp intentionally bound to a real-world-
// scale field, which DOES trigger the bug -- this is the fixture
// e2e/effect-scatter-chart-rendering.e2e.ts's test.fail()-annotated
// regression test targets). Do not "fix" the Sized-By-Population variant to
// render nicely -- that would defang the regression test bck-ma9 depends on.
const effectScatterSpec = defineChartExampleSpec<ScatterWithSeriesSample>({
  chartType: 'effect-scatter',
  description: 'GDP vs life expectancy by continent -- demonstrates an effect-scatter chart. Ships a second, intentionally-broken sizeProp variant preserving the bck-ma9 regression trigger.',
  arbitrary: demographicScatterArbitrary,
  notePrefix: 'Country',
  toRows: sample => sample.data.map(row => ({
    GDP: row.x,
    LifeExpectancy: row.y,
    Continent: row.continent,
    Population: row.population,
  })),
  variants: [
    {
      fileName: 'basic/Basic.base',
      viewName: 'GDP vs life expectancy (effect scatter)',
      viewType: 'effect-scatter-chart',
      propBindings: {
        xAxisProp: 'note.GDP',
        yAxisProp: 'note.LifeExpectancy',
        seriesProp: 'note.Continent',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'sized-by-population/Sized-By-Population.base',
      viewName: 'GDP vs life expectancy sized by population',
      viewType: 'effect-scatter-chart',
      propBindings: {
        xAxisProp: 'note.GDP',
        yAxisProp: 'note.LifeExpectancy',
        sizeProp: 'note.Population',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

// polar-scatter.ts already normalizes sizeProp via visualMap (unlike
// effect-scatter.ts above), so sizeProp is safe to bind here -- no bug to
// preserve, this is just the ordinary working example.
const polarScatterSpec = defineChartExampleSpec<ScatterWithSeriesSample>({
  chartType: 'polar-scatter',
  description: 'GDP vs life expectancy by continent, sized by population -- demonstrates a polar-scatter chart with a normalized sizeProp.',
  arbitrary: demographicScatterArbitrary,
  notePrefix: 'Country',
  toRows: sample => sample.data.map(row => ({
    GDP: row.x,
    LifeExpectancy: row.y,
    Continent: row.continent,
    Population: row.population,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'GDP vs life expectancy (polar scatter)',
      viewType: 'polar-scatter-chart',
      propBindings: {
        xAxisProp: 'note.GDP',
        yAxisProp: 'note.LifeExpectancy',
        seriesProp: 'note.Continent',
        sizeProp: 'note.Population',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface PieSample {
  readonly data: ReadonlyArray<{ readonly name: string, readonly value: number }>
}

const pieSpec = defineChartExampleSpec<PieSample>({
  chartType: 'pie',
  description: 'Sales by region -- demonstrates a basic pie chart.',
  arbitrary: pieChartArbitrary,
  notePrefix: 'Sales-Region',
  toRows: sample => sample.data.map(row => ({
    Region: row.name,
    Revenue: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Sales by region (pie)',
      viewType: 'pie-chart',
      propBindings: {
        xAxisProp: 'note.Region',
        yAxisProp: 'note.Revenue',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface FunnelSample {
  readonly data: ReadonlyArray<{ readonly step: string, readonly value: number }>
}

const funnelSpec = defineChartExampleSpec<FunnelSample>({
  chartType: 'funnel',
  description: 'User journey funnel -- demonstrates a funnel chart with decreasing stage values.',
  arbitrary: funnelChartArbitrary,
  notePrefix: 'Funnel-Stage',
  toRows: sample => sample.data.map(row => ({
    FunnelStage: row.step,
    Population: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'User journey funnel',
      viewType: 'funnel-chart',
      propBindings: {
        xAxisProp: 'note.FunnelStage',
        yAxisProp: 'note.Population',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface GaugeSample {
  readonly data: ReadonlyArray<{ readonly value: number }>
}

const gaugeSpec = defineChartExampleSpec<GaugeSample>({
  chartType: 'gauge',
  description: 'Server load gauge -- demonstrates a gauge chart with an averaging aggregation.',
  arbitrary: gaugeChartArbitrary,
  notePrefix: 'Server-Load',
  toRows: sample => sample.data.map(row => ({
    Load: row.value,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Server load gauge (average)',
      viewType: 'gauge-chart',
      propBindings: {
        yAxisProp: 'note.Load',
      },
      literalOptions: {
        aggregation: 'avg',
        minVal: 0,
        maxVal: 100,
        colorBands: '30:#67e0e3,70:#37a2da,100:#fd666d',
      },
    },
  ],
})

interface HeatmapSample {
  readonly data: ReadonlyArray<{ readonly day: string, readonly hour: string, readonly activity: number }>
}

const heatmapSpec = defineChartExampleSpec<HeatmapSample>({
  chartType: 'heatmap',
  description: 'Server load heatmap -- demonstrates a heatmap chart over a day x hour activity grid.',
  arbitrary: heatmapChartArbitrary,
  notePrefix: 'Server-Load',
  toRows: sample => sample.data.map(row => ({
    Time: row.hour,
    Server: row.day,
    Load: row.activity,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Server load heatmap',
      viewType: 'heatmap-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        yAxisProp: 'note.Server',
        valueProp: 'note.Load',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Server load heatmap (vintage theme)',
      viewType: 'heatmap-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        yAxisProp: 'note.Server',
        valueProp: 'note.Load',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      // Demonstrates the visualMapColor override -- the same hook a future
      // theme layer would drive to re-tint the ramp. Swaps the default
      // sequential blue for a sequential green ramp (still one hue, light->
      // dark), proving magnitude coloring is data-driven, not hardcoded.
      fileName: 'CustomColor.base',
      viewName: 'Server load heatmap (green ramp)',
      viewType: 'heatmap-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        yAxisProp: 'note.Server',
        valueProp: 'note.Load',
      },
      literalOptions: {
        showLegend: true,
        visualMapColor: '#e5f5e0,#a1d99b,#41ab5d,#238b45,#005a32',
      },
    },
  ],
})

interface PolarLineSample {
  readonly data: ReadonlyArray<{ readonly time: string, readonly server: string, readonly load: number }>
}

const polarLineSpec = defineChartExampleSpec<PolarLineSample>({
  chartType: 'polar-line',
  description: 'Server load across time-of-day buckets -- demonstrates a polar-line chart over a time x server cross-product.',
  arbitrary: polarLineChartArbitrary,
  notePrefix: 'Server-Load',
  toRows: sample => sample.data.map(row => ({
    Time: row.time,
    Server: row.server,
    Load: row.load,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Server load (polar line)',
      viewType: 'polar-line-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        valueProp: 'note.Load',
        seriesProp: 'note.Server',
      },
      // Explainability (bck-aie.27 feedback: "i dont know what to look for
      // here"). Polar-line has no cartesian axis chrome to lean on, so a title
      // + subtext state what's encoded; legend moves to the bottom so it
      // clears the top-left title.
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        title: 'Server load across time of day',
        description: 'Angle is time-of-day; distance from center is load. Each line is one server.',
      },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Server load (polar line, vintage theme)',
      viewType: 'polar-line-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        valueProp: 'note.Load',
        seriesProp: 'note.Server',
      },
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        theme: 'Vintage',
        title: 'Server load across time of day',
        description: 'Vintage palette variant of the same time x server polar line.',
      },
    },
    {
      fileName: 'Stacked.base',
      viewName: 'Total server load by time of day (stacked)',
      viewType: 'polar-line-chart',
      propBindings: {
        xAxisProp: 'note.Time',
        valueProp: 'note.Load',
        seriesProp: 'note.Server',
      },
      // Domain-specific variant: stack + areaStyle turns the per-server lines
      // into a filled composition, so the outer edge at each angle reads as
      // the fleet's total load for that time-of-day bucket.
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        stack: true,
        areaStyle: true,
        title: 'Total server load by time of day (stacked)',
        description: 'Each server\'s load stacks on the others; the outer edge is the fleet total for that time bucket.',
      },
    },
  ],
})

interface CalendarSample {
  readonly data: ReadonlyArray<{ readonly date: string, readonly mood: number }>
}

const calendarSpec = defineChartExampleSpec<CalendarSample>({
  chartType: 'calendar',
  description: 'Daily mood journal (1..5) -- demonstrates a calendar chart mapping a full year of daily values onto a sequential ramp.',
  arbitrary: calendarChartArbitrary,
  notePrefix: 'Mood-Day',
  toRows: sample => sample.data.map(row => ({
    Date: Temporal.PlainDate.from(row.date),
    Mood: row.mood,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Mood calendar',
      viewType: 'calendar-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mood',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Mood calendar (vintage theme)',
      viewType: 'calendar-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mood',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      // Overrides the default sequential blue with a sequential green ramp
      // (still one hue, light->dark) -- the same visualMapColor hook a future
      // theme layer would drive, and the recognizable "activity calendar" tint.
      fileName: 'CustomColor.base',
      viewName: 'Mood calendar (green ramp)',
      viewType: 'calendar-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mood',
      },
      literalOptions: {
        showLegend: true,
        visualMapColor: '#e5f5e0,#a1d99b,#41ab5d,#238b45,#005a32',
      },
    },
  ],
})

interface CandlestickSample {
  readonly data: ReadonlyArray<{
    readonly date: string
    readonly open: number
    readonly close: number
    readonly low: number
    readonly high: number
  }>
}

const candlestickSpec = defineChartExampleSpec<CandlestickSample>({
  chartType: 'candlestick',
  description: 'AAPL stock analysis -- demonstrates a candlestick chart.',
  arbitrary: candlestickChartArbitrary,
  notePrefix: 'AAPL-Day',
  toRows: sample => sample.data.map(row => ({
    Date: Temporal.PlainDate.from(row.date),
    Open: row.open,
    Close: row.close,
    High: row.high,
    Low: row.low,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'AAPL stock analysis',
      viewType: 'candlestick-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        openProp: 'note.Open',
        closeProp: 'note.Close',
        highProp: 'note.High',
        lowProp: 'note.Low',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'AAPL stock analysis (vintage theme)',
      viewType: 'candlestick-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        openProp: 'note.Open',
        closeProp: 'note.Close',
        highProp: 'note.High',
        lowProp: 'note.Low',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      fileName: 'Formula.base',
      viewName: 'AAPL stock analysis (formatted dates)',
      viewType: 'candlestick-chart',
      // Date-axis enrichment (bck-g79), mirroring line/area's Formula.base: the
      // raw ISO Date is pre-formatted by a Bases-native formula upstream and the
      // candlestick's category x-axis plots the resulting "Mon DD, YYYY" string.
      formulas: { FormattedDate: 'Date.format("MMM DD, YYYY")' },
      propBindings: {
        xAxisProp: 'formula.FormattedDate',
        openProp: 'note.Open',
        closeProp: 'note.Close',
        highProp: 'note.High',
        lowProp: 'note.Low',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface StackedAreaSample {
  readonly data: ReadonlyArray<{ readonly date: string, readonly region: string, readonly revenue: number }>
}

// area-chart is a rendering variant of line-chart, but ships a multi-series
// Month x Region dataset (not line's single-series random walk) so the
// stack toggle has real series to stack -- the overlapping "by region" view
// and the stacked view read the same notes, differing only in stack:true.
const areaSpec = defineChartExampleSpec<StackedAreaSample>({
  chartType: 'area',
  description: 'Monthly revenue by region -- demonstrates a multi-series area chart, unstacked and stacked.',
  arbitrary: stackedAreaChartArbitrary,
  notePrefix: 'Area-Revenue',
  toRows: sample => sample.data.map(row => ({
    Date: Temporal.PlainDate.from(row.date),
    Region: row.region,
    Revenue: row.revenue,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Sales by region (area)',
      viewType: 'area-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'Basic.base',
      viewName: 'Sales by region (stacked area)',
      viewType: 'area-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true, stack: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Sales by region (vintage theme)',
      viewType: 'area-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      fileName: 'FlippedAxis.base',
      viewName: 'Sales by region (flipped axis)',
      viewType: 'area-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true, flipAxis: true },
    },
    {
      fileName: 'Formula.base',
      viewName: 'Sales by region (formatted dates)',
      viewType: 'area-chart',
      // Feedback-driven variant: rather than a chart-side format option, the
      // x-axis binds to a Bases-native formula that pre-formats the raw ISO
      // Date into "January 01, 2024" upstream -- the user controls the
      // transform in Bases' own formula language, and the chart just plots the
      // resulting string category. Proves formula.* props flow through the
      // property picker unmodified (bck-g79).
      formulas: { FormattedDate: 'Date.format("MMMM DD, YYYY")' },
      propBindings: {
        xAxisProp: 'formula.FormattedDate',
        yAxisProp: 'note.Revenue',
        seriesProp: 'note.Region',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface BulletSample {
  readonly data: ReadonlyArray<{
    readonly metric: string
    readonly value: number
    readonly target: number
    readonly rangeLow: number
    readonly rangeMid: number
    readonly rangeHigh: number
  }>
}

const bulletSpec = defineChartExampleSpec<BulletSample>({
  chartType: 'bullet',
  description: 'KPI metrics against targets and range bands -- demonstrates a bullet chart.',
  arbitrary: bulletChartArbitrary,
  notePrefix: 'KPI',
  toRows: sample => sample.data.map(row => ({
    Metric: row.metric,
    Value: row.value,
    Target: row.target,
    RangeLow: row.rangeLow,
    RangeMid: row.rangeMid,
    RangeHigh: row.rangeHigh,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'KPI bullet chart',
      viewType: 'bullet-chart',
      propBindings: {
        xAxisProp: 'note.Metric',
        valueProp: 'note.Value',
        targetProp: 'note.Target',
        rangeLowProp: 'note.RangeLow',
        rangeMidProp: 'note.RangeMid',
        rangeHighProp: 'note.RangeHigh',
      },
      literalOptions: { showLegend: true },
    },
  ],
})

interface GanttSample {
  readonly data: ReadonlyArray<{
    readonly task: string
    readonly phase: string
    readonly project: string
    readonly start: string
    readonly end: string
  }>
}

const ganttSpec = defineChartExampleSpec<GanttSample>({
  chartType: 'gantt',
  description: 'Product delivery timeline -- each deliverable runs through Plan/Develop/Test/Release phases, demonstrating a multi-color phased gantt chart.',
  arbitrary: ganttChartArbitrary,
  notePrefix: 'Task',
  toRows: sample => sample.data.map(row => ({
    Task: row.task,
    Phase: row.phase,
    Start: Temporal.PlainDate.from(row.start),
    End: Temporal.PlainDate.from(row.end),
    Project: row.project,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Delivery timeline by phase',
      viewType: 'gantt-chart',
      propBindings: {
        taskProp: 'note.Task',
        startProp: 'note.Start',
        endProp: 'note.End',
        seriesProp: 'note.Phase',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'Basic.base',
      viewName: 'Delivery timeline by project',
      viewType: 'gantt-chart',
      propBindings: {
        taskProp: 'note.Task',
        startProp: 'note.Start',
        endProp: 'note.End',
        seriesProp: 'note.Project',
      },
      literalOptions: { showLegend: true },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'Delivery timeline (vintage theme)',
      viewType: 'gantt-chart',
      propBindings: {
        taskProp: 'note.Task',
        startProp: 'note.Start',
        endProp: 'note.End',
        seriesProp: 'note.Phase',
      },
      literalOptions: { showLegend: true, theme: 'Vintage' },
    },
    {
      fileName: 'Formula.base',
      viewName: 'Delivery timeline (quarter-labeled axis)',
      viewType: 'gantt-chart',
      // Gantt's time axis is a computed value axis of epoch-ms, not a bound
      // property, so area/Formula.base's pattern (bind an axis prop to a
      // Date.format() display string) can't drive it -- a formatted string
      // wouldn't parse back to a timestamp. Two things stand in for it here:
      // (1) xAxisFormat renders friendly "YYYY-Q" ticks on the time axis, and
      // (2) seriesProp binds to a formula.* computed column, proving formula
      // resolution flows through the gantt property pickers (bck-g79).
      formulas: { StartMonth: 'Start.format("MMM YYYY")' },
      propBindings: {
        taskProp: 'note.Task',
        startProp: 'note.Start',
        endProp: 'note.End',
        seriesProp: 'formula.StartMonth',
      },
      literalOptions: { showLegend: true, xAxisFormat: 'YYYY-[Q]Q' },
    },
  ],
})

interface ThemeRiverSample {
  readonly data: ReadonlyArray<{ readonly date: string, readonly topic: string, readonly mentions: number }>
}

const themeRiverSpec = defineChartExampleSpec<ThemeRiverSample>({
  chartType: 'theme-river',
  description: 'News topic mentions over a month -- demonstrates a theme river chart over a date x topic cross-product.',
  arbitrary: themeRiverChartArbitrary,
  notePrefix: 'News-Day',
  toRows: sample => sample.data.map(row => ({
    Date: Temporal.PlainDate.from(row.date),
    Topic: row.topic,
    Mentions: row.mentions,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'News topics river',
      viewType: 'theme-river-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mentions',
        seriesProp: 'note.Topic',
      },
      // Explainability (bck-aie.33 feedback: "never seen this chart... cant
      // provide feedback yet"). A title + subtext state what a theme river
      // encodes so a first-time reader knows what to look for; the legend
      // moves to the bottom so it clears the top-left title.
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        title: 'News topics over time',
        description: 'Each band is a topic; its thickness is that day\'s mention count. Bands stack to show total news volume.',
      },
    },
    {
      fileName: 'CustomTheme.base',
      viewName: 'News topics river (vintage theme)',
      viewType: 'theme-river-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mentions',
        seriesProp: 'note.Topic',
      },
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        theme: 'Vintage',
        title: 'News topics over time',
        description: 'Vintage palette variant of the same date x topic river.',
      },
    },
    {
      fileName: 'Vertical.base',
      viewName: 'News topics river (vertical)',
      viewType: 'theme-river-chart',
      propBindings: {
        xAxisProp: 'note.Date',
        valueProp: 'note.Mentions',
        seriesProp: 'note.Topic',
      },
      // flipAxis pivots the river to a vertical time flow -- the themeRiver
      // analog of the flipped-axis variant every enrichable chart ships.
      literalOptions: {
        showLegend: true,
        legendPosition: 'bottom',
        flipAxis: true,
        title: 'News topics over time (vertical)',
        description: 'Time runs top to bottom; bands spread horizontally.',
      },
    },
  ],
})

interface WordCloudSample {
  readonly data: ReadonlyArray<{ readonly word: string, readonly frequency: number }>
}

const wordCloudSpec = defineChartExampleSpec<WordCloudSample>({
  chartType: 'word-cloud',
  description: 'Keyword frequency -- demonstrates a word cloud chart.',
  arbitrary: wordCloudChartArbitrary,
  notePrefix: 'Keyword',
  toRows: sample => sample.data.map(row => ({
    Word: row.word,
    Frequency: row.frequency,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Keyword frequency (word cloud)',
      viewType: 'word-cloud-chart',
      propBindings: {
        xAxisProp: 'note.Word',
        yAxisProp: 'note.Frequency',
      },
      literalOptions: { shape: 'circle' },
    },
  ],
})

interface MapSample {
  readonly data: ReadonlyArray<{
    readonly landmark: string
    readonly lat: number
    readonly lon: number
    readonly eventType: string
    readonly eventCount: number
  }>
}

const mapSpec = defineChartExampleSpec<MapSample>({
  chartType: 'map',
  description: 'Chicago landmarks by event count -- demonstrates a map chart over a real GeoJSON asset.',
  arbitrary: mapChartArbitrary,
  notePrefix: 'Chicago-Landmark',
  toRows: sample => sample.data.map(row => ({
    Landmark: row.landmark,
    EventType: row.eventType,
    EventCount: row.eventCount,
    Latitude: row.lat,
    Longitude: row.lon,
  })),
  variants: [
    {
      fileName: 'Basic.base',
      viewName: 'Chicago landmarks by event count',
      viewType: 'map-chart',
      propBindings: {
        regionProp: 'note.Landmark',
        valueProp: 'note.EventCount',
      },
      literalOptions: {
        mapFile: 'map/assets/chicago-landmarks.geo.json',
        xAxisLabel: 'Chicago landmarks',
      },
      filters: ['note.Landmark != null'],
    },
  ],
})

export const registry: readonly ChartExampleSpec[] = [
  barSpec,
  lineSpec,
  radarSpec,
  parallelSpec,
  stackedBarSpec,
  pictorialBarSpec,
  radialBarSpec,
  roseSpec,
  boxplotSpec,
  histogramSpec,
  paretoSpec,
  waterfallSpec,
  sankeySpec,
  graphSpec,
  linesSpec,
  treeSpec,
  sunburstSpec,
  treemapSpec,
  scatterSpec,
  bubbleSpec,
  effectScatterSpec,
  polarScatterSpec,
  pieSpec,
  funnelSpec,
  gaugeSpec,
  heatmapSpec,
  polarLineSpec,
  calendarSpec,
  candlestickSpec,
  areaSpec,
  bulletSpec,
  ganttSpec,
  themeRiverSpec,
  wordCloudSpec,
  mapSpec,
]
