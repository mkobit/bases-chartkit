import { describe, it, expect } from 'bun:test'
import { z } from 'zod'
import { jsonParsed } from '../src/json-parsing'

describe('jsonParsed', () => {
  it('should successfully parse and validate a valid JSON string matching the schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })
    const parser = jsonParsed(schema)
    const input = JSON.stringify({ name: 'Alice', age: 30 })

    const result = parser.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'Alice', age: 30 })
    }
  })

  it('should fail when parsing invalid JSON', () => {
    const schema = z.object({
      name: z.string(),
    })
    const parser = jsonParsed(schema)
    const input = '{"name": "Alice"' // Missing closing brace

    const result = parser.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid JSON')
    }
  })

  it('should fail when the parsed JSON does not match the schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })
    const parser = jsonParsed(schema)
    const input = JSON.stringify({ name: 'Alice', age: '30' }) // age is a string, not a number

    const result = parser.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['age'])
      expect(result.error.issues[0].code).toBe('invalid_type')
    }
  })

  it('should handle empty input strings gracefully', () => {
    const schema = z.object({
      name: z.string(),
    })
    const parser = jsonParsed(schema)
    const input = ''

    const result = parser.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid JSON')
    }
  })

  it('should successfully parse deeply nested JSON', () => {
    const schema = z.object({
      level1: z.object({
        level2: z.object({
          level3: z.string(),
        }),
      }),
    })
    const parser = jsonParsed(schema)
    const input = JSON.stringify({ level1: { level2: { level3: 'deep' } } })

    const result = parser.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ level1: { level2: { level3: 'deep' } } })
    }
  })

  it('should successfully parse JSON with unicode strings', () => {
    const schema = z.object({
      text: z.string(),
    })
    const parser = jsonParsed(schema)
    const input = JSON.stringify({ text: 'Hello 🌍 你好' })

    const result = parser.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ text: 'Hello 🌍 你好' })
    }
  })
})
