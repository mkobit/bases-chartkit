## Purpose

Enables visualization of composite datasets where multiple related metrics of different render types (such as lines over bars or stacked bars) are displayed within a single coordinated Cartesian chart.

## ADDED Requirements

### Requirement: Combo chart view registration
The system SHALL register `combo-chart` as a supported Bases view type with standard view options.

#### Scenario: View registration check
- **WHEN** the plugin initializes
- **THEN** `combo-chart` is registered as an available Bases view type

### Requirement: Primary and overlay series configuration
The system SHALL render multiple series of different render types (bar, line, scatter) across shared categorical x-axis categories from Bases data.

#### Scenario: Bar with overlaid trend line
- **WHEN** user configures a categorical x-axis property, a primary metric property with type `bar`, and an overlay metric property with type `line`
- **THEN** the chart generates two coordinated series rendered on the shared x-axis

### Requirement: Dual y-axis scaling
The system SHALL support an optional secondary y-axis for the overlay series so metrics with disparate numeric scales can be viewed simultaneously.

#### Scenario: Dual y-axis enabled
- **WHEN** `overlayDualAxis` is set to true
- **THEN** the chart configures two y-axes and assigns `yAxisIndex: 1` to the overlay series

### Requirement: Stacking and grouping compatibility
The system SHALL allow primary bar or line series to be partitioned and stacked by a series dimension while preserving unstacked rendering for overlay series.

#### Scenario: Line over stacked bar series
- **WHEN** primary series specifies a `seriesProp` with `stack: true` alongside an overlay line series
- **THEN** primary series are partitioned and stacked by category dimension while the overlay series remains unstacked
