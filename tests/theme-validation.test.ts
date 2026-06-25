import { describe, it, expect } from 'bun:test'
import { themeSchema, parseTheme, validateTheme } from '../src/theme-validation'

describe(
  'Theme Validation',
  () => {
    describe(
      'themeSchema',
      () => {
        it(
          'should successfully parse a valid JSON object string',
          () => {
            const validJson = '{"color": ["#fff"]}'
            const result = themeSchema.safeParse(validJson)
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data).toEqual({ color: ['#fff'] })
            }
          },
        )

        it(
          'should successfully parse an empty JSON object string',
          () => {
            const validJson = '{}'
            const result = themeSchema.safeParse(validJson)
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data).toEqual({})
            }
          },
        )

        it(
          'should fail to parse an invalid JSON string',
          () => {
            const invalidJson = '{"color": ["#fff"'
            const result = themeSchema.safeParse(invalidJson)
            expect(result.success).toBe(false)
          },
        )

        it(
          'should fail to parse a JSON array string',
          () => {
            const arrayJson = '[]'
            const result = themeSchema.safeParse(arrayJson)
            expect(result.success).toBe(false)
          },
        )

        it(
          'should fail to parse a JSON null string',
          () => {
            const nullJson = 'null'
            const result = themeSchema.safeParse(nullJson)
            expect(result.success).toBe(false)
          },
        )

        it(
          'should fail to parse a JSON primitive string',
          () => {
            const numberJson = '123'
            const result = themeSchema.safeParse(numberJson)
            expect(result.success).toBe(false)

            const stringJson = '"string"'
            const result2 = themeSchema.safeParse(stringJson)
            expect(result2.success).toBe(false)
          },
        )
      },
    )

    describe(
      'parseTheme',
      () => {
        it(
          'should return a parsed object for a valid JSON object string',
          () => {
            const validJson = '{"backgroundColor": "#000"}'
            const result = parseTheme(validJson)
            expect(result).toEqual({ backgroundColor: '#000' })
          },
        )

        it(
          'should return null for an invalid JSON string',
          () => {
            const invalidJson = 'invalid'
            const result = parseTheme(invalidJson)
            expect(result).toBeNull()
          },
        )

        it(
          'should return null for a JSON array string',
          () => {
            const arrayJson = '[]'
            const result = parseTheme(arrayJson)
            expect(result).toBeNull()
          },
        )
      },
    )

    describe(
      'validateTheme',
      () => {
        it(
          'should return true for a valid JSON object string',
          () => {
            const validJson = '{"font": "Arial"}'
            const result = validateTheme(validJson)
            expect(result).toBe(true)
          },
        )

        it(
          'should return false for an invalid JSON string',
          () => {
            const invalidJson = '{'
            const result = validateTheme(invalidJson)
            expect(result).toBe(false)
          },
        )

        it(
          'should return false for a JSON array string',
          () => {
            const arrayJson = '["item"]'
            const result = validateTheme(arrayJson)
            expect(result).toBe(false)
          },
        )

        it(
          'should return false for a JSON null string',
          () => {
            const nullJson = 'null'
            const result = validateTheme(nullJson)
            expect(result).toBe(false)
          },
        )
      },
    )
  },
)
