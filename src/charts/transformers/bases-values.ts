// Obsidian's BasesNote#get() returns a `Value` wrapper (e.g.
// `{ icon: 'lucide-calendar', date: Date, time: false }` or
// `{ icon: 'lucide-binary', data: 3503 }`), not the raw property value.
// It duck-types as a record with a `renderTo` method (used internally by
// Obsidian to paint the value into the DOM) whose `toString()` produces the
// correctly formatted display text — unlike JSON.stringify, which dumps the
// wrapper's internal shape verbatim.
function isRenderableValue(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly toString: () => string } {
  return typeof o.renderTo === 'function'
}

export function safeToString(val: unknown): string {
  if (val === null || val === undefined) {
    return ''
  }
  if (typeof val === 'string') {
    return val
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  if (isRecord(val) && isRenderableValue(val)) {
    const rendered = val.toString()
    // A note that matches the base's filter but was never given this
    // property surfaces as Obsidian's `NullValue` sentinel -- a Value wrapper
    // like any other, but its `toString()` renders the literal text "null"
    // rather than an empty string. Treat that placeholder as absent so it
    // doesn't leak into chart labels/categories as a bogus "null" entry.
    return rendered === 'null' ? '' : rendered
  }
  return JSON.stringify(val)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Obsidian's BasesView passes data items whose `note` (and similar) fields
// are class instances (e.g. `BasesNote`) — properties are accessed via
// `.get(key)`, NOT direct property access. We duck-type that: when direct
// access fails, fall back to a `.get(key)` accessor if one exists.
function isRecordWithGetAccessor(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly get: (key: string) => unknown } {
  return typeof o.get === 'function'
}

// A Bases data row (BasesEntry) resolves any property id -- note.*, file.*,
// and crucially formula.* -- through a single getValue(propertyId) evaluator.
function isRecordWithGetValueAccessor(
  o: Record<string, unknown>,
): o is Record<string, unknown> & { readonly getValue: (id: string) => unknown } {
  return typeof o.getValue === 'function'
}

export function getNestedValue(obj: unknown, path: string): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return undefined
  }
  // Bases formula results (`formula.<name>`) are computed lazily and are NOT
  // reachable by dot-walking the entry the way `note.*`/`file.*` fields are --
  // they're only exposed via the entry's own getValue(propertyId) evaluator,
  // which also runs the formula. Verified live (bck-g79): dot-walking
  // formula.* yields undefined -> a bogus "Unknown" category, while
  // entry.getValue('formula.FormattedDate') returns the evaluated value. Gated
  // to the `formula.` prefix so note.*/file.* keep their existing direct-access
  // path (and its handling of genuinely-absent props) unchanged.
  if (path.startsWith('formula.') && isRecord(obj) && isRecordWithGetValueAccessor(obj)) {
    return obj.getValue(path)
  }
  return path.split('.').reduce(
    (o: unknown, key: string): unknown => {
      if (!isRecord(o)) {
        return undefined
      }
      const direct = key in o ? o[key] : undefined
      return direct !== undefined
        ? direct
        : isRecordWithGetAccessor(o) ? o.get(key) : undefined
    },
    obj,
  )
}
