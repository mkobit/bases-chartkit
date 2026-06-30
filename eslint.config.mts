import tseslint from 'typescript-eslint'
import obsidianmd from 'eslint-plugin-obsidianmd'
import globals from 'globals'
import functional from 'eslint-plugin-functional'
import promise from 'eslint-plugin-promise'
import stylistic from '@stylistic/eslint-plugin'
import unicorn from 'eslint-plugin-unicorn'
import { globalIgnores } from 'eslint/config'
import json from '@eslint/json'
import yml from 'eslint-plugin-yml'

const jsFiles = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.mts', '**/*.cts']

function restrictToJs(config: any) {
  // Strip the `json` plugin from obsidianmd's bundled configs so our own @eslint/json
  // registration doesn't conflict with obsidianmd's bundled instance.
  const plugins: Record<string, any> = config.plugins ?? {}
  const restPlugins = Object.fromEntries(Object.entries(plugins).filter(([k]) => k !== 'json'))
  const cleaned = { ...config, plugins: restPlugins }
  if (!cleaned.files) {
    return { ...cleaned, files: jsFiles }
  }
  return cleaned
}

// Define custom rule for package.json dependency sorting
const packageJsonPlugin = {
  rules: {
    'sort-dependencies': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Sort dependencies alphabetically',
        },
        fixable: 'code',
      },
      create(context: any) {
        return {
          'Member'(node: any) {
            if (
              node.name
              && node.name.type === 'String'
              && ['dependencies', 'devDependencies', 'peerDependencies', 'scripts'].includes(node.name.value)
            ) {
              if (node.value && node.value.type === 'Object') {
                const members = node.value.members
                const memberNames = members.map((m: any) => m.name.value)
                const sortedMemberNames = [...memberNames].sort()

                const isSorted = memberNames.every((name: string, index: number) => name === sortedMemberNames[index])

                if (!isSorted) {
                  context.report({
                    node: node.value,
                    message: `Dependencies in '${node.name.value}' should be sorted alphabetically.`,
                    fix(fixer: any) {
                      const memberPairs = members.map((m: any) => {
                        return {
                          name: m.name.value,
                          // We reconstruct the JSON string for the member
                          // Assuming simple key-value pairs for deps
                          key: JSON.stringify(m.name.value),
                          value: JSON.stringify(m.value.value),
                        }
                      })

                      memberPairs.sort((a: any, b: any) => a.name.localeCompare(b.name))

                      // Reconstruct the object content with indentation
                      // Assuming standard package.json indentation (tabs)
                      // The object itself is indented by 1 tab, so members are 2 tabs.
                      const indentation = '\t\t'
                      const content = memberPairs.map((p: any) => `${indentation}${p.key}: ${p.value}`).join(',\n')

                      // Wrap in braces with correct outer indentation
                      const newText = `{\n${content}\n\t}`

                      return fixer.replaceText(node.value, newText)
                    },
                  })
                }
              }
            }
          },
        }
      },
    },
  },
}

export default tseslint.config(
  {
    ignores: [
      // Plugin install artifacts inside the test vault — populated at runtime by `bun run vault:install`
      // eslint-disable-next-line obsidianmd/hardcoded-config-path
      'obsidian-bases-charts-example-vault/.obsidian/plugins/**',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        Number: 'readonly',
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'eslint.config.js',
            'manifest.json',
            'eslint.config.mts',
            'esbuild.config.mjs',
            'version-bump.mjs',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.json'],
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-undef': 'off',
    },
  },
  // Recommended configs
  ...[...obsidianmd.configs.recommended].map(restrictToJs),
  ...yml.configs['flat/recommended'],
  restrictToJs(functional.configs.strict),
  restrictToJs(functional.configs.stylistic),
  restrictToJs(stylistic.configs.recommended),
  // Note: tseslint.configs.recommended and functional.configs.externalTypeScriptRecommended
  // are intentionally NOT spread here. obsidianmd.configs.recommended already registers the
  // @typescript-eslint plugin via its internal extends. Spreading tseslint.configs.recommended
  // would redefine the plugin with a different object instance and throw a ConfigError.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      obsidianmd,
      functional,
      promise,
      unicorn,
    },
    rules: {
      ...promise.configs.recommended.rules,

      // ObsidianMD Rules
      'obsidianmd/prefer-file-manager-trash-file': 'error',

      // Additional clean code rules
      'no-console': 'error',
      'eqeqeq': 'error',
      'curly': 'error',

      'no-restricted-globals': ['error', {
        name: 'Date',
        message: 'Use Temporal (from temporal-polyfill) instead of Date. In Obsidian code, use moment.',
      }],
      'no-restricted-imports': ['error', {
        patterns: ['**/index', '**/index.ts', '**/index.js'],
      }],

      // Type Safety Rules
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never',
      }],
      // Enforce separate type imports (User Request)
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      }],

      // Unicorn Rules
      'unicorn/numeric-separators-style': 'error',

      // Ensure strictness explicitly (reinforcing 'strict' config)
      'functional/no-let': 'error',
      'functional/no-loop-statements': 'error',
      'functional/no-conditional-statements': 'error',
      'functional/no-expression-statements': ['error', { ignoreVoid: true }],
      'functional/no-classes': 'error',
      'functional/no-this-expressions': 'error',
      'functional/no-return-void': 'error',
      'functional/no-mixed-types': 'error',
      'functional/no-try-statements': 'error',
      'functional/no-throw-statements': 'error',
      'functional/no-promise-reject': 'error',
      'functional/prefer-property-signatures': 'error',
      'functional/prefer-tacit': 'error',
      'functional/readonly-type': ['error', 'keyword'],
      'functional/no-class-inheritance': 'error',
      'functional/functional-parameters': 'error',
      'functional/immutable-data': ['error', {
        ignoreClasses: true,
        ignoreAccessorPattern: ['this.**'],
      }],
      'functional/prefer-immutable-types': ['error', {
        enforcement: 'ReadonlyShallow',
        ignoreClasses: true,
        ignoreTypePattern: ['^.*Option$'],
      }],
      'functional/type-declaration-immutability': ['error', {
        rules: [
          {
            identifiers: '^I?Mutable.+',
            immutability: 'Mutable',
            comparator: 'AtLeast',
          },
          {
            identifiers: '^(?!I?Mutable).+',
            immutability: 'ReadonlyDeep',
            comparator: 'AtLeast',
          },
        ],
        ignoreInterfaces: false,
      }],

    },
  },
  // Generic JSON
  {
    files: ['**/*.json', '**/*.jsonc'],
    ignores: ['package.json'], // handled separately
    language: 'json/json',
    plugins: {
      json,
    },
    rules: {
      'json/no-duplicate-keys': 'error',
      'json/no-empty-keys': 'error',
    },
  },
  // Configuration for package.json
  {
    files: ['package.json'],
    language: 'json/json',
    plugins: {
      json,
      'package-json': packageJsonPlugin,
    },
    rules: {
      'package-json/sort-dependencies': 'error',
      // Enable recommended JSON rules
      'json/no-duplicate-keys': 'error',
      'json/no-empty-keys': 'error',
      // Restore override for depend/ban-dependencies
      'depend/ban-dependencies': 'off',
    },
  },
  // Overrides for Obsidian Plugin Code (Views, Main, Settings)
  {
    files: ['src/views/**/*.ts', 'src/main.ts', 'src/settings.ts'],
    rules: {
      // RELAX Functional Rules for Obsidian API
      // The Obsidian API necessitates classes, inheritance, side effects, and mutations (of 'this').
      'functional/no-expression-statements': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      'functional/no-classes': 'off',
      'functional/no-class-inheritance': 'off',
      'functional/no-this-expressions': 'off',
      'functional/no-return-void': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-promise-reject': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/functional-parameters': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/immutable-data': ['error', {
        ignoreClasses: true,
        ignoreAccessorPattern: ['this.**'],
      }],
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  // Overrides for Tests
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', 'e2e/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Relax rules for Testing patterns (Assertions, Mocking, Setup/Teardown)
      'functional/no-expression-statements': 'off', // Needed for expect() assertions
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }], // Allow devDependencies in tests
      'import/no-nodejs-modules': 'off', // Node built-ins are allowed in tests and e2e fixtures
      '@typescript-eslint/consistent-type-assertions': 'off', // Needed for mocking
      '@typescript-eslint/no-unsafe-argument': 'off', // Allow unsafe args in tests
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'functional/no-return-void': 'off', // Needed for test/beforeEach callbacks
      'functional/no-classes': 'off', // Allowed in tests if needed (e.g. mock classes)
      'functional/no-class-inheritance': 'off',
      'functional/no-this-expressions': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-promise-reject': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/functional-parameters': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/immutable-data': ['error', {
        ignoreClasses: true,
        ignoreAccessorPattern: ['this.**'],
      }],
      'no-empty-pattern': 'off', // Playwright fixtures require ({}, use) destructure syntax
      'functional/no-let': 'off', // Allow let in Playwright e2e tests
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions in tests
      '@typescript-eslint/no-implied-eval': 'off', // evaluateObsidian uses new Function() to serialize/deserialize test fns
    },
  },
  // Legacy Transformers (Pending Refactor)
  {
    files: ['src/charts/transformers/**/*.ts', 'src/@types/**/*.ts', 'src/charts/transformer.ts'],
    rules: {
      'functional/no-return-void': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/readonly-type': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-conditional-statements': 'off',
    },
  },
  // Refactored Transformers (Strict)
  {
    files: [
      'src/charts/transformer.ts',
      'src/charts/transformers/base.ts',
      'src/charts/transformers/cartesian.ts',
      'src/charts/transformers/gantt.ts',
      'src/charts/transformers/pie.ts',
      'src/charts/transformers/scatter.ts',
      'src/charts/transformers/utils.ts',
    ],
    rules: {
      'functional/prefer-immutable-types': ['error', {
        enforcement: 'ReadonlyShallow',
        ignoreClasses: true,
        ignoreTypePattern: ['^.*Option$'],
      }],
      'functional/type-declaration-immutability': ['error', {
        rules: [
          {
            identifiers: '^I?Mutable.+',
            immutability: 'Mutable',
            comparator: 'AtLeast',
          },
          {
            identifiers: '^(?!I?Mutable).+',
            immutability: 'ReadonlyShallow',
            comparator: 'AtLeast',
          },
        ],
        ignoreInterfaces: false,
      }],
    },
  },
  // Temporary override for gantt.ts pending refactor
  {
    files: ['src/charts/transformers/gantt.ts'],
    rules: {
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/readonly-type': 'off',
    },
  },
  // Scripts
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.cjs', 'esbuild.config.mjs', 'version-bump.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'obsidianmd/no-plugin-as-component': 'off',
      'obsidianmd/no-view-references-in-plugin': 'off',
      'obsidianmd/prefer-file-manager-trash-file': 'off',
      'obsidianmd/prefer-active-window-timers': 'off',
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/prefer-instanceof': 'off',
      'obsidianmd/no-obsidian-internal-api': 'off',
      'obsidianmd/no-unsupported-features': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      'obsidianmd/hardcoded-config-path': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'import/no-nodejs-modules': 'off',
      'no-console': 'off',
      'obsidianmd/rule-custom-message': 'off',
      'functional/no-return-void': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-promise-reject': 'off',
      'functional/no-loop-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/prefer-immutable-types': 'off',
      'functional/type-declaration-immutability': 'off',
      'functional/readonly-type': 'off',
      'functional/functional-parameters': 'off',
      // Allow require in scripts
      '@typescript-eslint/no-require-imports': 'off',
      // Relax stylistic indent for scripts if mixed content, but generally enforce tab
      '@stylistic/indent': ['error', 2],
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'functional/no-expression-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/prefer-immutable-types': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // `as unknown as T` strips type safety and has shipped two real
    // runtime bugs in this repo (BaseChartView.config and ItemView.addAction).
    // Block the pattern repo-wide. To override at a specific site, add
    // `// eslint-disable-next-line no-restricted-syntax -- reason` with a
    // genuine reason (library type bridge, etc.).
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: {
      unicorn,
    },
    rules: {
      'unicorn/prefer-optional-catch-binding': 'error',
      'no-restricted-syntax': ['error', {
        selector: 'TSAsExpression > TSAsExpression[typeAnnotation.type=\'TSUnknownKeyword\']',
        message: 'Avoid `as unknown as T` casts. Augment types or extract a typed accessor. If a library type bridge genuinely needs it, eslint-disable-next-line with a reason comment.',
      },
      {
        selector: 'CatchClause > BlockStatement[body.length=0]',
        message: 'Empty catch blocks are forbidden. Handle the error or use an eslint-disable comment with a reason.',
      },
      {
        selector: 'CatchClause > BlockStatement[body.length=1] > ExpressionStatement > CallExpression[callee.object.name=\'console\'][callee.property.name=/^(error|log|warn|info)$/]',
        message: 'Catch blocks that only log are forbidden. Re-throw, handle via Notice, or wrap the error.',
      },
      {
        selector: 'CatchClause > Identifier[typeAnnotation.typeAnnotation.type=\'TSAnyKeyword\']',
        message: 'Catch clauses with \'any\' type annotation are forbidden. Bind typed error or omit if unused.',
      }],
    },
  },
  // Config files (relax rules)
  {
    files: ['eslint.config.mts', 'playwright.config.ts'],
    rules: {
      'functional/prefer-immutable-types': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-return-void': 'off',
      'functional/immutable-data': 'off',
      'functional/type-declaration-immutability': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      'no-undef': 'off',
    },
  },
  globalIgnores([
    'node_modules',
    'dist',
    'eslint.config.js',
    'versions.json',
    'main.js',
    'coverage',
    'playwright-report/**',
    'test-results/**',
  ]),
)
