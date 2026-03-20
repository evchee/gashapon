import yargsParser from 'yargs-parser'
import { EXIT } from '../output/exit-codes.js'
import { StructuredError } from '../output/errors.js'

export interface ParsedFlags {
  toolArgs: Record<string, unknown>
  meta: {
    dryRun: boolean
    quiet: boolean
    json: boolean
    idempotencyKey?: string
    capabilities: boolean
    debug: boolean
  }
}

const META_FLAGS = new Set([
  'dry-run', 'quiet', 'q', 'json', 'idempotency-key', 'capabilities', 'debug',
])

export function parseFlags(argv: string[], inputSchema: Record<string, unknown>): ParsedFlags {
  const properties = (inputSchema.properties as Record<string, { type?: string; enum?: string[]; description?: string }>) ?? {}
  const required = (inputSchema.required as string[]) ?? []

  // Build yargs-parser config for type coercion
  const booleanFlags: string[] = []
  const numberFlags: string[] = []
  const arrayFlags: string[] = []
  const stringFlags: string[] = []

  for (const [key, prop] of Object.entries(properties)) {
    const type = prop.type
    if (type === 'boolean') booleanFlags.push(key)
    else if (type === 'integer' || type === 'number') numberFlags.push(key)
    else if (type === 'array') arrayFlags.push(key)
    else stringFlags.push(key)
  }

  const parsed = yargsParser(argv, {
    boolean: ['dry-run', 'quiet', 'json', 'capabilities', 'debug', ...booleanFlags],
    number: numberFlags,
    array: arrayFlags,
    string: ['idempotency-key', ...stringFlags],
    alias: { q: 'quiet' },
    configuration: { 'strip-aliased': true, 'camel-case-expansion': false },
  })

  const meta: ParsedFlags['meta'] = {
    dryRun: Boolean(parsed['dry-run']),
    quiet: Boolean(parsed.quiet),
    json: Boolean(parsed.json),
    idempotencyKey: parsed['idempotency-key'] as string | undefined,
    capabilities: Boolean(parsed.capabilities),
    debug: Boolean(parsed.debug),
  }

  const toolArgs: Record<string, unknown> = {}

  // Support JSON blob as positional argument: `capsule cmd '{"key": "val"}'`
  const positional = (parsed._ as string[]).filter(a => typeof a === 'string' && a.length > 0)
  if (positional.length === 1) {
    try {
      const blob = JSON.parse(positional[0])
      if (blob !== null && typeof blob === 'object' && !Array.isArray(blob)) {
        for (const [key, val] of Object.entries(blob as Record<string, unknown>)) {
          if (key in properties && !META_FLAGS.has(key)) {
            toolArgs[key] = val
          }
        }
      }
    } catch {
      // Not JSON — ignore, fall through to flag-only parsing
    }
  }

  // Explicit flags take precedence over JSON blob values
  for (const key of Object.keys(properties)) {
    if (key in parsed && !META_FLAGS.has(key)) {
      let val = parsed[key]
      // Parse JSON objects
      if (properties[key]?.type === 'object' && typeof val === 'string') {
        try { val = JSON.parse(val) } catch { /* leave as string */ }
      }
      // Validate enum
      if (properties[key]?.enum && !properties[key].enum!.includes(val as string)) {
        throw new StructuredError({
          code: 'USAGE_ERROR',
          message: `Invalid value "${val}" for --${key}. Must be one of: ${properties[key].enum!.join(', ')}`,
          exitCode: EXIT.USAGE,
        })
      }
      toolArgs[key] = val
    }
  }

  // Warn on unknown flags (keys in parsed that are not meta and not in schema)
  const unknownFlags: string[] = []
  for (const key of Object.keys(parsed)) {
    if (key === '_') continue
    if (META_FLAGS.has(key)) continue
    if (key in properties) continue
    unknownFlags.push(key)
  }
  if (unknownFlags.length > 0) {
    const available = Object.keys(properties)
    const suggestions = [
      `Unknown flag(s): ${unknownFlags.map(f => `--${f}`).join(', ')}`,
      `Available flags: ${available.map(f => `--${f}`).join(', ')}`,
    ]
    throw new StructuredError({
      code: 'USAGE_ERROR',
      message: `Unknown flag(s): ${unknownFlags.map(f => `--${f}`).join(', ')}`,
      exitCode: EXIT.USAGE,
      suggestions,
    })
  }

  // Check required flags — show all available flags in suggestions to help agents self-correct
  const missing = required.filter(r => !(r in toolArgs))
  if (missing.length > 0) {
    const allFlags = Object.entries(properties).map(([name, prop]) => {
      const req = required.includes(name) ? ' (required)' : ''
      const type = prop.type ?? 'string'
      const desc = prop.description ? ` — ${prop.description}` : ''
      return `--${name} <${type}>${req}${desc}`
    })
    throw new StructuredError({
      code: 'USAGE_ERROR',
      message: `Missing required flag(s): ${missing.map(m => `--${m}`).join(', ')}`,
      exitCode: EXIT.USAGE,
      suggestions: allFlags,
    })
  }

  return { toolArgs, meta }
}
