# Example Chart Data

This folder contains example data files and **.base** configuration files to demonstrate the **Obsidian Charts** plugin.

## How to Use

1.  Open this folder (`example`) as an Obsidian vault.
2.  Install the **Obsidian Charts** plugin (if not already installed).
3.  Install the **Bases** plugin (required for creating views).
4.  Open any `.base` file (e.g., `Sales-Dashboard.base`) to see the configured charts populated with data.

## Base Files & Included Charts

*   **`Sales-Dashboard.base`**: Demonstrates Bar, Line, Pie, Stacked Bar, and Area charts using sales data.
*   **`Finance.base`**: Demonstrates the Candlestick chart for stock market data.
*   **`IT_Metrics.base`**: Shows Heatmap and Gauge charts for server monitoring data.
*   **`Project_Management.base`**: Visualizes hierarchical task data using Treemap, Sunburst, and Tree charts.
*   **`Demographics.base`**: Uses country statistics for Scatter, Bubble, and Funnel charts.
*   **`Relationships.base`**: Visualizes flows and networks using Sankey and Graph charts.
*   **`Personal.base`**: Displays a Mood Tracker using the Calendar chart.
*   **`RPG_Stats.base`**: Uses a Radar chart to compare character attributes (Strength, Intelligence, Agility).
*   **`Academic.base`**: Uses a Boxplot to show the distribution of exam scores.
*   **`Trends.base`**: Uses a ThemeRiver chart to visualize topic trends over time.
*   **`Effect-Scatter.base`**: Uses an Effect Scatter chart to highlight GDP vs. life expectancy.
*   **`Histogram.base`**: Shows the distribution of exam scores as a Histogram.
*   **`Lines-Chart.base`**: Draws point-to-point routes using a Lines chart.
*   **`Parallel-Coordinates.base`**: Compares character attributes using a Parallel Coordinates chart.
*   **`Pareto-Chart.base`**: Ranks department spend with a Pareto chart.
*   **`Pictorial-Bar.base`**: Shows department spend using a Pictorial Bar chart.
*   **`Polar-Bar.base`**: Shows department spend using a Polar Bar chart.
*   **`Polar-Line.base`**: Shows server load over time using a Polar Line chart.
*   **`Polar-Scatter.base`**: Uses a Polar Scatter chart to plot GDP vs. life expectancy.
*   **`Radial-Bar.base`**: Shows department spend using a Radial Bar chart.
*   **`Rose-Chart.base`**: Shows department spend using a Rose chart.
*   **`Waterfall-Chart.base`**: Visualizes a budget walk with a Waterfall chart.
*   **`Word-Cloud.base`**: Visualizes keyword frequency with a Word Cloud chart.
*   **`Bullet-Chart.base`**: Tracks KPIs against targets and ranges with a Bullet chart.
*   **`Map-Chart.base`**: Shades Chicago landmarks by event count using a Map (choropleth) chart.

## Data Source
The raw data files are located in the `Charts/` directory. Each file contains YAML frontmatter properties corresponding to the chart configurations.
The GeoJSON region asset used by `Map-Chart.base` is in `Assets/`.
