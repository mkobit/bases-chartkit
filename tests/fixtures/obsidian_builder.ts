import { Temporal } from 'temporal-polyfill'
import * as R from 'remeda'

/**
 * Represents the valid types for Obsidian frontmatter properties.
 * Now includes Temporal types.
 */
export type FrontmatterValue
  = | string
    | number
    | boolean
    | null
    | Temporal.PlainDate
    | Temporal.ZonedDateTime
    | Temporal.Instant
    | readonly FrontmatterValue[]

/**
 * A strongly-typed representation of an Obsidian frontmatter block.
 */
export type Frontmatter = Record<string, FrontmatterValue>

/**
 * Interface representing a test Obsidian file.
 */
export interface TestFile {
  readonly name: string
  readonly path: readonly string[]
  readonly filename: string
  readonly frontmatter: Frontmatter
  readonly content?: string
}

/**
 * Builder for creating TestFile instances.
 * Implements functional updates internally even if interface is fluent.
 */
export class ObsidianFileBuilder {
  private file: TestFile

  private constructor(name: string) {
    this.file = {
      name,
      filename: `${name}.md`,
      path: [],
      frontmatter: {},
    }
  }

  static create(name: string): ObsidianFileBuilder {
    return new ObsidianFileBuilder(name)
  }

  withPath(segments: readonly string[]): ObsidianFileBuilder {
    this.file = { ...this.file,
      path: segments }
    return this
  }

  withProperty(key: string, value: FrontmatterValue): ObsidianFileBuilder {
    this.file = { ...this.file,
      frontmatter: { ...this.file.frontmatter,
        [key]: value } }
    return this
  }

  withFrontmatter(frontmatter: Frontmatter): ObsidianFileBuilder {
    this.file = { ...this.file,
      frontmatter: { ...this.file.frontmatter,
        ...frontmatter } }
    return this
  }

  withContent(content: string): ObsidianFileBuilder {
    this.file = { ...this.file,
      content: content }
    return this
  }

  build(): TestFile {
    return {
      ...this.file,
      path: [...this.file.path],
      frontmatter: { ...this.file.frontmatter },
    }
  }

  toRawString(): string {
    const fmKeys = Object.keys(this.file.frontmatter)
    const yamlBlock = fmKeys.length > 0
      ? R.pipe(
          fmKeys,
          R.filter(key => this.file.frontmatter[key] !== undefined),
          // @ts-expect-error - suppress strictNullChecks/type errors
          R.map(key => `${key}: ${this.formatYamlValue(this.file.frontmatter[key])}`),
          R.join('\n'),
          content => `---\n${content}\n---\n`,
        )
      : ''

    return yamlBlock + (this.file.content || '')
  }

  private formatYamlValue(val: FrontmatterValue): string {
    if (val === null) {
      return 'null'
    }

    if (val instanceof Temporal.PlainDate
      || val instanceof Temporal.ZonedDateTime
      || val instanceof Temporal.Instant) {
      return val.toString()
    }

    if (Array.isArray(val)) {
      // Recursive call for array items
      return `[${val.map((v: FrontmatterValue) => this.formatYamlValue(v)).join(', ')}]`
    }

    if (typeof val === 'string') {
      return `"${val}"`
    }

    return String(val)
  }
}
