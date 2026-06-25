import { Command, InvalidArgumentError } from 'commander'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { Temporal } from 'temporal-polyfill'
import type * as fc from 'fast-check'
import { generateCommandString, getDeterministicSample } from './generators/utils'
import { barChartArbitrary } from './generators/bar'
import { bubbleChartArbitrary } from './generators/bubble'
import { boxplotChartArbitrary, histogramChartArbitrary, paretoChartArbitrary, waterfallChartArbitrary } from './generators/distribution'
import { candlestickChartArbitrary } from './generators/financial'
import { sankeyChartArbitrary, graphChartArbitrary, linesChartArbitrary } from './generators/flow'
import { funnelChartArbitrary, gaugeChartArbitrary } from './generators/funnel'
import { heatmapChartArbitrary, calendarChartArbitrary } from './generators/heatmap'
import { sunburstChartArbitrary, treeChartArbitrary, treemapChartArbitrary } from './generators/hierarchy'
import { lineChartArbitrary } from './generators/line'
import { pieChartArbitrary } from './generators/pie'
import { radarChartArbitrary } from './generators/radar'
import { scatterChartArbitrary } from './generators/scatter'

const program = new Command()

function parseInteger(value: string) {
  const parsedValue = parseInt(
    value,
    10,
  )
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.')
  }
  return parsedValue
}

// Map of all chart types to their arbitraries
const chartArbitraries: Record<string, fc.Arbitrary<unknown>> = {
  bar: barChartArbitrary,
  boxplot: boxplotChartArbitrary,
  bubble: bubbleChartArbitrary,
  calendar: calendarChartArbitrary,
  candlestick: candlestickChartArbitrary,
  funnel: funnelChartArbitrary,
  gauge: gaugeChartArbitrary,
  graph: graphChartArbitrary,
  heatmap: heatmapChartArbitrary,
  histogram: histogramChartArbitrary,
  line: lineChartArbitrary,
  lines: linesChartArbitrary,
  pareto: paretoChartArbitrary,
  pie: pieChartArbitrary,
  radar: radarChartArbitrary,
  sankey: sankeyChartArbitrary,
  scatter: scatterChartArbitrary,
  sunburst: sunburstChartArbitrary,
  tree: treeChartArbitrary,
  treemap: treemapChartArbitrary,
  waterfall: waterfallChartArbitrary,
}

program
  .name('generate')
  .description('Generate chart examples')
  .option(
    '-s, --seed <seed>',
    'Seed for random generation',
    parseInteger,
  )
  .option(
    '--skip-confirm',
    'Skip confirmation prompt',
    false,
  )
  .action(async (options: { seed?: number
    skipConfirm: boolean }) => {
    const seed = options.seed ?? Temporal.Now.instant().epochMilliseconds

    const commandString = generateCommandString(seed)

    if (!options.skipConfirm) {
      console.log(`This will generate examples using seed: ${seed}`)
      console.log('Proceed? (y/N)')
      const rl = readline.createInterface({ input,
        output })
      const answer = await rl.question('> ')
      rl.close()
      if (answer.trim().toLowerCase() !== 'y') {
        console.log('Aborted.')
        process.exit(0)
      }
    }

    console.log(`Command: ${commandString}`)

    const results: Record<string, unknown> = {}

    // Iterate over the map to generate results, avoiding repetition
    for (const [key,
      arbitrary] of Object.entries(chartArbitraries)) {
      results[key] = getDeterministicSample(
        arbitrary,
        seed,
      )
    }

    console.log(JSON.stringify(
      results,
      null,
      2,
    ))
  })

program.parse()
