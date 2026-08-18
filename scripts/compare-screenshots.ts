#!/usr/bin/env bun
// Pixel-diffs two directories of same-named PNGs (e.g. two
// `docs:screenshots:headless` output sets) and reports, per file, the
// percentage of pixels that differ and the max single-channel delta seen.
//
// No PNG/image-diff library is a project dependency (see package.json) --
// this decodes just enough of the PNG spec to handle what Playwright's
// `locator.screenshot()` produces: 8-bit-depth, non-interlaced, truecolor
// (RGB, colorType 2) or truecolor-with-alpha (RGBA, colorType 6) images.
// That covers every screenshot this repo generates; it deliberately does not
// handle palette/grayscale/interlaced PNGs or bit depths other than 8.
//
// Usage: bun scripts/compare-screenshots.ts <dirA> <dirB> [--threshold=N]
//   threshold: per-channel delta (0-255) at or below which a pixel does NOT
//   count as differing -- default 0 (any non-identical byte counts). This is
//   a reporting tool, not a pass/fail gate: it always exits 0.
//
// Written for bck-6gf (chart-type doc screenshots weren't pixel-deterministic
// across separate docs:screenshots:headless runs). Two back-to-back runs on
// 2026-08-18, after adding a `waitForVaultIndexed` wait to
// e2e/survey/chart-types.survey.ts (it previously only waited for
// `onLayoutReady`, not for Obsidian's "Indexing vault..." banner to clear --
// that banner was overlapping whichever chart(s) happened to be captured
// during the vault's post-layout indexing window, which is exactly what
// produced bck-6gf's original "unrelated chart types with an identical diff
// footprint" clue), came out to 60/65 screenshots byte-identical at
// threshold=0. The 5 that still differ, and why, going forward:
//   - word-cloud (~11-20% diff): echarts-wordcloud's own layout.js calls
//     unseeded Math.random() for word placement order (Fisher-Yates shuffle),
//     rotation, and (if used) color -- confirmed by reading
//     node_modules/echarts-wordcloud/src/layout.js. Not fixable from this
//     repo without patching/forking that dependency.
//   - graph (~4%): ECharts' force-directed layout (layout: 'force') is an
//     iterative physics simulation with no seed control; ~510 settle
//     iterations are float-summation-order sensitive, which can converge to
//     visibly different final node positions across independent process
//     launches.
//   - effect-scatter, effect-scatter-sized-by-population (~2-14%): the
//     `effectScatter` series type's default rippleEffect animates
//     perpetually (it never fires a final 'finished' state the way an
//     entrance animation does) -- a screenshot is inherently a snapshot of
//     whatever ripple phase is active at capture time.
// None of these are software-rasterizer/font-hinting variance -- the
// 60/65 exact-match rate is itself evidence that SwiftShader rendering
// (forced via e2e/fixtures/obsidian.ts's --disable-gpu* flags, added for
// bck-to4) is deterministic across launches on this machine. A
// review-gate threshold (see bck-ghj) should treat the three chart types
// above as expected-to-differ (skip, or a generous per-type tolerance) and
// hold everything else to a near-zero threshold -- the one remaining
// non-excluded diff seen in this run (area/Formula, 0.19%/788px, scattered
// sub-pixel AA jitter around date-axis label glyphs) suggests a threshold
// around 1% is a safe, well-justified floor for those.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as zlib from 'node:zlib'

interface DecodedPng {
  readonly width: number
  readonly height: number
  readonly channels: 3 | 4
  // Un-filtered pixel data, one byte per channel per pixel, row-major, no
  // padding -- i.e. exactly `width * height * channels` bytes.
  readonly pixels: Uint8Array
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const range = (n: number): ReadonlyArray<number> => Array.from({ length: n }, (_, i) => i)

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) {
    return a
  }
  if (pb <= pc) {
    return b
  }
  return c
}

function reconstructByte(filterType: number, x: number, a: number, b: number, c: number, row: number): number {
  switch (filterType) {
    case 0: return x
    case 1: return x + a
    case 2: return x + b
    case 3: return x + Math.floor((a + b) / 2)
    case 4: return x + paethPredictor(a, b, c)
    default:
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(`unsupported PNG filter type ${filterType} at row ${row}`)
  }
}

// Reverses PNG's per-scanline filtering (spec section 9), returning the raw
// (unfiltered) image bytes. `out` is mutated in place as an accumulator --
// this is scripts/-scope code (functional/immutable-data is relaxed there,
// see eslint.config.mts), and a fresh array per byte would be wasteful for
// images with hundreds of thousands of pixels.
function unfilter(inflated: Buffer, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp
  const out = new Uint8Array(height * stride)
  const columnIndices = range(stride)

  for (const row of range(height)) {
    const srcOffset = row * (stride + 1)
    const filterType = inflated[srcOffset]
    if (filterType === undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
      throw new Error(`truncated PNG data at row ${row}`)
    }
    const rowStart = row * stride
    const prevRowStart = (row - 1) * stride

    for (const i of columnIndices) {
      const x = inflated[srcOffset + 1 + i]
      if (x === undefined) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
        throw new Error(`truncated PNG data at row ${row}, byte ${i}`)
      }
      const a = i >= bpp ? (out[rowStart + i - bpp] ?? 0) : 0
      const b = row > 0 ? (out[prevRowStart + i] ?? 0) : 0
      const c = row > 0 && i >= bpp ? (out[prevRowStart + i - bpp] ?? 0) : 0
      out[rowStart + i] = reconstructByte(filterType, x, a, b, c, row) & 0xff
    }
  }
  return out
}

interface IhdrFields {
  readonly width: number
  readonly height: number
  readonly bitDepth: number
  readonly colorType: number
  readonly interlace: number
}

interface ChunkParseState {
  readonly ihdr?: IhdrFields
  readonly idatChunks: ReadonlyArray<Buffer>
  readonly done: boolean
}

// PNG chunks are variable-length, so walking them is an inherently
// sequential fold over the buffer -- expressed here as recursion over an
// immutable accumulator rather than a `let offset` loop.
function parseChunks(buf: Buffer, offset: number, state: ChunkParseState): ChunkParseState {
  if (state.done || offset >= buf.length) {
    return state
  }
  const length = buf.readUInt32BE(offset)
  const type = buf.toString('ascii', offset + 4, offset + 8)
  const dataStart = offset + 8
  const data = buf.subarray(dataStart, dataStart + length)
  const nextOffset = dataStart + length + 4 // skip CRC

  if (type === 'IHDR') {
    return parseChunks(buf, nextOffset, {
      ...state,
      ihdr: {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data.readUInt8(8),
        colorType: data.readUInt8(9),
        interlace: data.readUInt8(12),
      },
    })
  }
  if (type === 'IDAT') {
    return parseChunks(buf, nextOffset, { ...state, idatChunks: [...state.idatChunks, Buffer.from(data)] })
  }
  if (type === 'IEND') {
    return { ...state, done: true }
  }
  return parseChunks(buf, nextOffset, state)
}

async function decodePng(filePath: string): Promise<DecodedPng> {
  const buf = await fs.readFile(filePath)
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`${filePath}: not a PNG (bad signature)`)
  }

  const { ihdr, idatChunks } = parseChunks(buf, 8, { idatChunks: [], done: false })
  if (ihdr === undefined) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`${filePath}: missing IHDR`)
  }
  if (ihdr.bitDepth !== 8) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`${filePath}: unsupported bit depth ${ihdr.bitDepth} (only 8-bit PNGs are supported)`)
  }
  if (ihdr.interlace !== 0) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`${filePath}: interlaced PNGs are not supported`)
  }
  if (ihdr.colorType !== 2 && ihdr.colorType !== 6) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`${filePath}: unsupported color type ${ihdr.colorType} (only truecolor/truecolor+alpha are supported)`)
  }

  const channels: 3 | 4 = ihdr.colorType === 6 ? 4 : 3
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const pixels = unfilter(inflated, ihdr.width, ihdr.height, channels)

  return { width: ihdr.width, height: ihdr.height, channels, pixels }
}

interface CompareResult {
  readonly totalPixels: number
  readonly diffPixels: number
  readonly maxDelta: number
  readonly diffPercent: number
}

function comparePixels(a: DecodedPng, b: DecodedPng, threshold: number): CompareResult {
  if (a.width !== b.width || a.height !== b.height) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- plain `new Error(...)`; pre-existing false positive, see e2e/fixtures/obsidian.ts.
    throw new Error(`dimension mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`)
  }
  const totalPixels = a.width * a.height
  const channels = Math.min(a.channels, b.channels)
  const channelIndices = range(channels)

  // Scalar running totals, mutated via object-property assignment (allowed
  // in scripts/-scope code) rather than `let` -- avoids allocating a
  // totalPixels-length intermediate array just to reduce over it.
  const totals = { diffPixels: 0, maxDelta: 0 }

  for (const p of range(totalPixels)) {
    const pixelMaxDelta = channelIndices.reduce((maxSoFar, c) => {
      const av = a.pixels[p * a.channels + c] ?? 0
      const bv = b.pixels[p * b.channels + c] ?? 0
      return Math.max(maxSoFar, Math.abs(av - bv))
    }, 0)
    if (pixelMaxDelta > totals.maxDelta) {
      totals.maxDelta = pixelMaxDelta
    }
    if (pixelMaxDelta > threshold) {
      totals.diffPixels += 1
    }
  }

  return { totalPixels, diffPixels: totals.diffPixels, maxDelta: totals.maxDelta, diffPercent: (totals.diffPixels / totalPixels) * 100 }
}

interface ReportRow extends CompareResult {
  readonly file: string
}

function formatReport(rows: ReadonlyArray<ReportRow>, threshold: number): string {
  const header = `${'file'.padEnd(60)} ${'diff%'.padStart(8)} ${'diffPx'.padStart(10)} ${'total'.padStart(10)} ${'maxDelta'.padStart(9)}`
  const lines = rows.map(r =>
    `${r.file.padEnd(60)} ${r.diffPercent.toFixed(2).padStart(7)}% ${String(r.diffPixels).padStart(10)} ${String(r.totalPixels).padStart(10)} ${String(r.maxDelta).padStart(9)}`,
  )
  const identical = rows.filter(r => r.diffPixels === 0).length
  return [
    `threshold: per-channel delta > ${threshold} counts as differing`,
    header,
    ...lines,
    '',
    `${identical}/${rows.length} identical, ${rows.length - identical}/${rows.length} differ (threshold=${threshold})`,
  ].join('\n')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const positional = args.filter(a => !a.startsWith('--'))
  const thresholdArg = args.find(a => a.startsWith('--threshold='))
  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 0

  const [dirA, dirB] = positional
  if (dirA === undefined || dirB === undefined) {
    console.error('Usage: bun scripts/compare-screenshots.ts <dirA> <dirB> [--threshold=N]')
    process.exit(1)
  }

  const filesA = new Set((await fs.readdir(dirA)).filter(f => f.endsWith('.png')))
  const filesB = new Set((await fs.readdir(dirB)).filter(f => f.endsWith('.png')))
  const common = [...filesA].filter(f => filesB.has(f)).toSorted()
  const onlyInA = [...filesA].filter(f => !filesB.has(f))
  const onlyInB = [...filesB].filter(f => !filesA.has(f))

  if (onlyInA.length > 0) {
    console.warn(`only in ${dirA}: ${onlyInA.join(', ')}`)
  }
  if (onlyInB.length > 0) {
    console.warn(`only in ${dirB}: ${onlyInB.join(', ')}`)
  }

  const rows = await Promise.all(common.map(async (file): Promise<ReportRow> => {
    const [a, b] = await Promise.all([
      decodePng(path.join(dirA, file)),
      decodePng(path.join(dirB, file)),
    ])
    return { file, ...comparePixels(a, b, threshold) }
  }))

  console.log(formatReport(rows.toSorted((r1, r2) => r2.diffPercent - r1.diffPercent), threshold))
}

main().catch((err: unknown) => {
  console.error('Fatal error in compare-screenshots:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
