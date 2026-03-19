import { describe, it, expect } from 'vitest'
import { parseFlags } from '../../src/runtime/flags.js'

const schema = {
  type: 'object',
  properties: {
    channel: { type: 'string', description: 'Channel name' },
    limit: { type: 'integer', description: 'Max results' },
    verbose: { type: 'boolean', description: 'Verbose mode' },
    tags: { type: 'array', description: 'Tags' },
    format: { type: 'string', enum: ['json', 'text', 'table'] },
  },
  required: ['channel'],
}

describe('parseFlags', () => {
  it('parses string flag', () => {
    const result = parseFlags(['--channel', 'general'], schema)
    expect(result.toolArgs.channel).toBe('general')
  })

  it('coerces integer flag', () => {
    const result = parseFlags(['--channel', 'general', '--limit', '10'], schema)
    expect(result.toolArgs.limit).toBe(10)
  })

  it('parses boolean flag', () => {
    const result = parseFlags(['--channel', 'general', '--verbose'], schema)
    expect(result.toolArgs.verbose).toBe(true)
  })

  it('throws on missing required flag', () => {
    expect(() => parseFlags([], schema)).toThrow('Missing required flag')
  })

  it('validates enum values', () => {
    expect(() => parseFlags(['--channel', 'x', '--format', 'xml'], schema)).toThrow()
  })

  it('separates meta flags', () => {
    const result = parseFlags(['--channel', 'general', '--dry-run', '--json'], schema)
    expect(result.meta.dryRun).toBe(true)
    expect(result.meta.json).toBe(true)
    expect(result.toolArgs.channel).toBe('general')
  })

  it('captures idempotency key', () => {
    const result = parseFlags(['--channel', 'x', '--idempotency-key', 'abc123'], schema)
    expect(result.meta.idempotencyKey).toBe('abc123')
  })
})
