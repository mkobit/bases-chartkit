import { describe, expect, test } from 'bun:test'
import { transformDataToChartOption } from '../../../src/charts/transformer'
import { getTitleOption } from '../../../src/charts/transformers/title'

describe('Chart titles and explainability descriptions', () => {
  describe('getTitleOption', () => {
    test('returns undefined when neither title nor description is provided', () => {
      expect(getTitleOption({})).toBeUndefined()
      expect(getTitleOption(undefined)).toBeUndefined()
    })

    test('returns title text when only title is provided', () => {
      const opt = getTitleOption({ title: 'Global GDP Growth' })
      expect(opt).toEqual({
        text: 'Global GDP Growth',
        left: 'left',
        top: 0,
      })
    })

    test('returns subtext when only description is provided', () => {
      const opt = getTitleOption({ description: 'Logarithmic scale of GDP per capita' })
      expect(opt).toEqual({
        subtext: 'Logarithmic scale of GDP per capita',
        left: 'left',
        top: 0,
      })
    })

    test('returns both text and subtext when title and description are provided', () => {
      const opt = getTitleOption({
        title: 'GDP vs Life Expectancy',
        description: 'Scatter plot of annual GDP against average life expectancy per country',
      })
      expect(opt).toEqual({
        text: 'GDP vs Life Expectancy',
        subtext: 'Scatter plot of annual GDP against average life expectancy per country',
        left: 'left',
        top: 0,
      })
    })
  })

  describe('transformDataToChartOption title and description injection', () => {
    const dummyData = [
      { country: 'A', gdp: 100, life: 75 },
      { country: 'B', gdp: 200, life: 80 },
    ]

    test('injects title and description into scatter chart option', () => {
      const option = transformDataToChartOption(
        dummyData,
        'gdp',
        'life',
        'scatter',
        {
          title: 'GDP vs Life Expectancy',
          description: 'GDP on X axis, Life Expectancy on Y axis',
        },
      )

      expect(option.title).toEqual({
        text: 'GDP vs Life Expectancy',
        subtext: 'GDP on X axis, Life Expectancy on Y axis',
        left: 'left',
        top: 0,
      })
    })

    test('injects title and description into polar line chart option', () => {
      const option = transformDataToChartOption(
        dummyData,
        'gdp',
        'life',
        'polarLine',
        {
          title: 'Radial Metric Distribution',
          description: 'Angle represents GDP value; radius represents life expectancy',
        },
      )

      expect(option.title).toEqual({
        text: 'Radial Metric Distribution',
        subtext: 'Angle represents GDP value; radius represents life expectancy',
        left: 'left',
        top: 0,
      })
    })

    test('injects title and description into bar, gauge, and map charts', () => {
      const barOpt = transformDataToChartOption(dummyData, 'country', 'gdp', 'bar', {
        title: 'Country GDP Comparison',
        description: 'Total GDP per country in USD billions',
      })
      expect(barOpt.title).toEqual({
        text: 'Country GDP Comparison',
        subtext: 'Total GDP per country in USD billions',
        left: 'left',
        top: 0,
      })

      const gaugeOpt = transformDataToChartOption(dummyData, '', 'gdp', 'gauge', {
        title: 'Storage Utilization',
        description: 'Current disk usage metric',
      })
      expect(gaugeOpt.title).toEqual({
        text: 'Storage Utilization',
        subtext: 'Current disk usage metric',
        left: 'left',
        top: 0,
      })

      const mapOpt = transformDataToChartOption(dummyData, '', 'gdp', 'map', {
        mapName: 'USA',
        title: 'State Population',
        description: 'Choropleth map of state census data',
      })
      expect(mapOpt.title).toEqual({
        text: 'State Population',
        subtext: 'Choropleth map of state census data',
        left: 'left',
        top: 0,
      })
    })

    test('merges title and description when chart transformer returns pre-existing title text', () => {
      // parallel chart returns title: { text: 'No dimensions specified' } when dimensions string is empty
      const option = transformDataToChartOption(
        dummyData,
        '',
        '',
        'parallel',
        {
          title: 'User Parallel Title',
          description: 'Explainability caption',
        },
      )

      expect(option.title).toEqual({
        text: 'No dimensions specified',
        subtext: 'Explainability caption',
        left: 'left',
        top: 0,
      })
    })
  })
})
