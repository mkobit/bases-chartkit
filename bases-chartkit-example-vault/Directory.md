# Bases Chart Kit example vault

This vault demonstrates every chart type supported by Bases Chart Kit. Each folder is a self-contained example: the chart type's `.base` file(s) plus the backing notes they read from.

Browse every example `.base` file interactively:

```base
filters:
  and:
    - file.ext == "base"
properties:
  file.folder:
    displayName: Chart type
views:
  - type: cards
    name: Chart types (cards)
    order:
      - file.name
      - file.folder
  - type: list
    name: Chart types (list)
    order:
      - file.name
      - file.folder
```

## Chart types

- **[[area/Basic.base|area]]** — Monthly revenue by region -- demonstrates a multi-series area chart, unstacked and stacked. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=area-basic))
- **[[bar/Basic.base|bar]]** — Department spend, ranked -- demonstrates a basic bar chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bar-simple))
- **[[boxplot/Basic.base|boxplot]]** — Product score distribution -- demonstrates a boxplot chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=boxplot-multi))
- **[[bubble/Basic.base|bubble]]** — Weighted point cloud -- demonstrates a bubble chart with size-encoded points. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bubble-gradient))
- **[[bullet/Basic.base|bullet]]** — KPI metrics against targets and range bands -- demonstrates a bullet chart.
- **[[calendar/Basic.base|calendar]]** — Daily mood journal (1..5) -- demonstrates a calendar chart mapping a full year of daily values onto a sequential ramp. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=calendar-heatmap))
- **[[candlestick/Basic.base|candlestick]]** — AAPL stock analysis -- demonstrates a candlestick chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=candlestick-simple))
- **[[effect-scatter/basic/Basic.base|effect-scatter]]** — GDP vs life expectancy by continent -- demonstrates an effect-scatter chart. Ships a second, intentionally-broken sizeProp variant preserving the bck-ma9 regression trigger. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=scatter-effect))
- **[[funnel/Basic.base|funnel]]** — User journey funnel -- demonstrates a funnel chart with decreasing stage values. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=funnel))
- **[[gantt/Basic.base|gantt]]** — Product delivery timeline -- each deliverable runs through Plan/Develop/Test/Release phases, demonstrating a multi-color phased gantt chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=custom-gantt-flight))
- **[[gauge/Basic.base|gauge]]** — Server load gauge -- demonstrates a gauge chart with an averaging aggregation. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=gauge))
- **[[graph/Basic.base|graph]]** — Network topology -- demonstrates a graph chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=graph-simple))
- **[[heatmap/Basic.base|heatmap]]** — Server load heatmap -- demonstrates a heatmap chart over a day x hour activity grid. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=heatmap-cartesian))
- **[[histogram/Basic.base|histogram]]** — Score distribution -- demonstrates a histogram chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bar-histogram))
- **[[line/Basic.base|line]]** — Daily revenue trend -- demonstrates a basic line chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=line-simple))
- **[[lines/Basic.base|lines]]** — Route lines -- demonstrates a lines chart with start/end coordinate pairs. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=lines-airline))
- **[[map/Basic.base|map]]** — Chicago landmarks by event count -- demonstrates a map chart over a real GeoJSON asset. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=map-usa))
- **[[parallel/Basic.base|parallel]]** — Character attribute comparison grouped by class -- demonstrates a parallel-coordinates chart, reusing radarChartArbitrary. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=parallel-simple))
- **[[pareto/Basic.base|pareto]]** — Product sales, ranked -- demonstrates a pareto chart.
- **[[pictorial-bar/Basic.base|pictorial-bar]]** — Department spend, ranked -- demonstrates a pictorial bar chart with a custom symbol. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=pictorialBar-vehicle))
- **[[pie/Basic.base|pie]]** — Sales by region -- demonstrates a basic pie chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=pie-simple))
- **[[polar-line/Basic.base|polar-line]]** — Server load across time-of-day buckets -- demonstrates a polar-line chart over a time x server cross-product. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=line-polar))
- **[[polar-scatter/Basic.base|polar-scatter]]** — GDP vs life expectancy by continent, sized by population -- demonstrates a polar-scatter chart with a normalized sizeProp. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=scatter-polar-punchCard))
- **[[radar/Basic.base|radar]]** — Character attribute comparison -- demonstrates a radar chart with multiple series. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=radar))
- **[[radial-bar/Basic.base|radial-bar]]** — Department spend, ranked -- demonstrates a radial bar chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bar-polar-real-estate))
- **[[rose/Basic.base|rose]]** — Department spend, ranked -- demonstrates a rose chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=pie-roseType-simple))
- **[[sankey/Basic.base|sankey]]** — User funnel flow -- demonstrates a sankey chart. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=sankey-simple))
- **[[scatter/Basic.base|scatter]]** — GDP vs life expectancy by continent -- demonstrates a scatter chart with a categorical series. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=scatter-simple))
- **[[stacked-bar/Basic.base|stacked-bar]]** — Quarterly revenue by region -- demonstrates a stacked bar chart with multiple series. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bar-stack))
- **[[sunburst/Basic.base|sunburst]]** — Company org chart -- demonstrates a sunburst chart over hierarchical, slash-delimited path data. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=sunburst-simple))
- **[[theme-river/Basic.base|theme-river]]** — News topic mentions over a month -- demonstrates a theme river chart over a date x topic cross-product. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=themeRiver-basic))
- **[[tree/Basic.base|tree]]** — Company org chart -- demonstrates a tree chart over hierarchical, slash-delimited path data. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=tree-basic))
- **[[treemap/Basic.base|treemap]]** — Org headcount by division -- demonstrates a treemap over multi-root, slash-delimited hierarchical path data with area-proportional leaves. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=treemap-simple))
- **[[waterfall/Basic.base|waterfall]]** — Budget waterfall -- demonstrates a waterfall chart with connector lines and absolute-total bars. ([ECharts example](https://echarts.apache.org/examples/en/editor.html?c=bar-waterfall))
- **[[word-cloud/Basic.base|word-cloud]]** — Keyword frequency -- demonstrates a word cloud chart. ([ECharts example](https://ecomfe.github.io/echarts-wordcloud/example/wordCloud.html))
