# Chart Types Reference

This document provides a reference for every chart type supported by the plugin, along with a minimal sample `.base` configuration for each.

## bar
Displays categorical data with rectangular bars with heights or lengths proportional to the values that they represent.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: bar-chart
    name: Bar Chart Sample
    xAxisProp: note.Category
    yAxisProp: note.Value
```

## boxplot
Displays a statistical summary of numerical data through their quartiles, highlighting the median, upper and lower quartiles, and outliers.
```yaml
properties:
  note.Subject:
    displayName: Subject
  note.Score:
    displayName: Score
views:
  - type: boxplot-chart
    name: Boxplot Sample
    xAxisProp: note.Subject
    yAxisProp: note.Score
```

## bubble
Displays three dimensions of data, where each entity with its triplet (v1, v2, v3) is plotted as a disk that expresses two of the values through the disk's xy location and the third through its size.
```yaml
properties:
  note.X:
    displayName: X Value
  note.Y:
    displayName: Y Value
  note.Size:
    displayName: Size
views:
  - type: bubble-chart
    name: Bubble Chart Sample
    xAxisProp: note.X
    yAxisProp: note.Y
    sizeProp: note.Size
```

## bullet
Displays performance data in a rich horizontal bar, often comparing a primary measure to one or more other measures to enrich its meaning.
```yaml
properties:
  note.Metric:
    displayName: Metric
  note.Value:
    displayName: Value
views:
  - type: bullet-chart
    name: Bullet Chart Sample
    yAxisProp: note.Metric
    xAxisProp: note.Value
```

## calendar
Displays data activity or events over the course of a calendar year or month, using color intensity to represent values.
```yaml
properties:
  note.Date:
    displayName: Date
  note.Value:
    displayName: Value
views:
  - type: calendar-chart
    name: Calendar Sample
    dateProp: note.Date
    valueProp: note.Value
```

## candlestick
Displays the high, low, open, and close prices of a security or derivative over a specific period, commonly used in financial analysis.
```yaml
properties:
  note.Date:
    displayName: Date
  note.Open:
    displayName: Open Price
  note.Close:
    displayName: Close Price
  note.Low:
    displayName: Low Price
  note.High:
    displayName: High Price
views:
  - type: candlestick-chart
    name: Candlestick Sample
    xAxisProp: note.Date
    openProp: note.Open
    closeProp: note.Close
    lowProp: note.Low
    highProp: note.High
```

## effectScatter
Displays a scatter plot with a ripple effect animation on the data points, useful for drawing attention to specific map coordinates or values.
```yaml
properties:
  note.X:
    displayName: X Value
  note.Y:
    displayName: Y Value
views:
  - type: effect-scatter-chart
    name: Effect Scatter Sample
    xAxisProp: note.X
    yAxisProp: note.Y
```

## funnel
Displays the progressive reduction of data as it passes from one phase to another, resembling a funnel shape.
```yaml
properties:
  note.Stage:
    displayName: Stage
  note.Value:
    displayName: Value
views:
  - type: funnel-chart
    name: Funnel Chart Sample
    nameProp: note.Stage
    valueProp: note.Value
```

## gantt
Displays a project schedule, showing the start and finish dates of various elements or tasks within a project.
```yaml
properties:
  note.Task:
    displayName: Task
  note.Start:
    displayName: Start Date
  note.End:
    displayName: End Date
views:
  - type: gantt-chart
    name: Gantt Chart Sample
    taskProp: note.Task
    startProp: note.Start
    endProp: note.End
```

## gauge
Displays a single value within a given quantitative context, resembling a speedometer or dial.
```yaml
properties:
  note.Metric:
    displayName: Metric
  note.Value:
    displayName: Value
views:
  - type: gauge-chart
    name: Gauge Chart Sample
    nameProp: note.Metric
    valueProp: note.Value
```

## graph
Displays relationships or connections between different entities using nodes and edges.
```yaml
properties:
  note.Source:
    displayName: Source Node
  note.Target:
    displayName: Target Node
views:
  - type: graph-chart
    name: Graph Sample
    sourceProp: note.Source
    targetProp: note.Target
```

## heatmap
Displays data values represented as colors in a two-dimensional grid or matrix.
```yaml
properties:
  note.X:
    displayName: X Category
  note.Y:
    displayName: Y Category
  note.Value:
    displayName: Value
views:
  - type: heatmap-chart
    name: Heatmap Sample
    xAxisProp: note.X
    yAxisProp: note.Y
    valueProp: note.Value
```

## histogram
Displays the frequency distribution of continuous data by dividing the data into bins and counting the number of observations in each bin.
```yaml
properties:
  note.Value:
    displayName: Value
views:
  - type: histogram-chart
    name: Histogram Sample
    valueProp: note.Value
```

## line
Displays information as a series of data points connected by straight line segments, ideal for showing trends over time.
```yaml
properties:
  note.Date:
    displayName: Date
  note.Value:
    displayName: Value
views:
  - type: line-chart
    name: Line Chart Sample
    xAxisProp: note.Date
    yAxisProp: note.Value
```

## lines
Displays multiple lines mapping paths, routes, or connections between geographical or abstract coordinates.
```yaml
properties:
  note.Route:
    displayName: Route
  note.Coordinates:
    displayName: Coordinates
views:
  - type: lines-chart
    name: Lines Chart Sample
    routeProp: note.Route
    coordProp: note.Coordinates
```

## map
Displays data points or regions on a geographic map, often using colors or markers to represent values.
```yaml
properties:
  note.Region:
    displayName: Region
  note.Value:
    displayName: Value
views:
  - type: map-chart
    name: Map Chart Sample
    regionProp: note.Region
    valueProp: note.Value
```

## parallel
Displays multivariate data by drawing multiple parallel axes and representing each data point as a line passing through the axes.
```yaml
properties:
  note.Metric1:
    displayName: Metric 1
  note.Metric2:
    displayName: Metric 2
  note.Metric3:
    displayName: Metric 3
views:
  - type: parallel-chart
    name: Parallel Coordinates Sample
    props:
      - note.Metric1
      - note.Metric2
      - note.Metric3
```

## pareto
Displays both individual values represented by bars in descending order, and the cumulative total represented by a line.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: pareto-chart
    name: Pareto Chart Sample
    xAxisProp: note.Category
    yAxisProp: note.Value
```

## pictorialBar
Displays a bar chart where the bars are composed of customized icons or images rather than simple rectangles.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: pictorial-bar-chart
    name: Pictorial Bar Sample
    xAxisProp: note.Category
    yAxisProp: note.Value
```

## pie
Displays data as a circular graphic divided into slices to illustrate numerical proportion.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: pie-chart
    name: Pie Chart Sample
    nameProp: note.Category
    valueProp: note.Value
```

## polarBar
Displays a bar chart plotted on a polar coordinate system, often used to show directional data.
```yaml
properties:
  note.Direction:
    displayName: Direction
  note.Value:
    displayName: Value
views:
  - type: polar-bar-chart
    name: Polar Bar Sample
    angleProp: note.Direction
    radiusProp: note.Value
```

## polarLine
Displays a line chart plotted on a polar coordinate system, connecting data points around a central hub.
```yaml
properties:
  note.Angle:
    displayName: Angle
  note.Value:
    displayName: Value
views:
  - type: polar-line-chart
    name: Polar Line Sample
    angleProp: note.Angle
    radiusProp: note.Value
```

## polarScatter
Displays a scatter plot mapped onto a polar coordinate system.
```yaml
properties:
  note.Angle:
    displayName: Angle
  note.Distance:
    displayName: Distance
views:
  - type: polar-scatter-chart
    name: Polar Scatter Sample
    angleProp: note.Angle
    radiusProp: note.Distance
```

## radar
Displays multivariate data in the form of a two-dimensional chart of three or more quantitative variables represented on axes starting from the same point.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Metric1:
    displayName: Metric 1
  note.Metric2:
    displayName: Metric 2
views:
  - type: radar-chart
    name: Radar Chart Sample
    nameProp: note.Category
    metricProps:
      - note.Metric1
      - note.Metric2
```

## radialBar
Displays a bar chart in a circular form, with bars extending outward from the center, functioning similarly to a standard bar chart but in a polar system.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: radial-bar-chart
    name: Radial Bar Sample
    angleProp: note.Category
    radiusProp: note.Value
```

## rose
Displays data using a Nightingale rose chart (or polar area chart), where each category is represented by a sector with a radius proportional to the value.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: rose-chart
    name: Rose Chart Sample
    nameProp: note.Category
    valueProp: note.Value
```

## sankey
Displays flow quantities proportionally, showing transfers or distribution between different nodes or stages.
```yaml
properties:
  note.Source:
    displayName: Source
  note.Target:
    displayName: Target
  note.Value:
    displayName: Value
views:
  - type: sankey-chart
    name: Sankey Chart Sample
    sourceProp: note.Source
    targetProp: note.Target
    valueProp: note.Value
```

## scatter
Displays values for typically two variables for a set of data as a collection of points, revealing correlations or clusters.
```yaml
properties:
  note.X:
    displayName: X Value
  note.Y:
    displayName: Y Value
views:
  - type: scatter-chart
    name: Scatter Chart Sample
    xAxisProp: note.X
    yAxisProp: note.Y
```

## sunburst
Displays hierarchical data as a series of concentric rings, where each ring corresponds to a level in the hierarchy.
```yaml
properties:
  note.Path:
    displayName: Path
  note.Value:
    displayName: Value
views:
  - type: sunburst-chart
    name: Sunburst Chart Sample
    pathProp: note.Path
    valueProp: note.Value
```

## themeRiver
Displays changes in different categories over time as a flowing river of varying widths, also known as a streamgraph.
```yaml
properties:
  note.Date:
    displayName: Date
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: theme-river-chart
    name: Theme River Sample
    dateProp: note.Date
    categoryProp: note.Category
    valueProp: note.Value
```

## tree
Displays hierarchical data in a standard node-link tree structure, illustrating parent-child relationships.
```yaml
properties:
  note.Parent:
    displayName: Parent
  note.Child:
    displayName: Child
views:
  - type: tree-chart
    name: Tree Chart Sample
    parentProp: note.Parent
    childProp: note.Child
```

## treemap
Displays hierarchical data as a set of nested rectangles, where the area of each rectangle is proportional to its value.
```yaml
properties:
  note.Category:
    displayName: Category
  note.Value:
    displayName: Value
views:
  - type: treemap-chart
    name: Treemap Sample
    nameProp: note.Category
    valueProp: note.Value
```

## waterfall
Displays how an initial value is affected by a series of intermediate positive or negative values, useful for financial analysis.
```yaml
properties:
  note.Stage:
    displayName: Stage
  note.Change:
    displayName: Change
views:
  - type: waterfall-chart
    name: Waterfall Chart Sample
    xAxisProp: note.Stage
    yAxisProp: note.Change
```

## wordCloud
Displays a collection of text data where the size of each word indicates its frequency or importance.
```yaml
properties:
  note.Word:
    displayName: Word
  note.Weight:
    displayName: Weight
views:
  - type: word-cloud-chart
    name: Word Cloud Sample
    wordProp: note.Word
    weightProp: note.Weight
```
