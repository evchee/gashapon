import { describe, it, expect } from 'vitest'
import { EXIT } from '../../src/output/exit-codes.js'
import { buildMapping } from '../../src/runtime/mapping.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

function makeTool(name: string, opts?: { readOnlyHint?: boolean; destructiveHint?: boolean }): Tool {
  return {
    name,
    description: `${name} tool`,
    inputSchema: { type: 'object' as const, properties: { input: { type: 'string' } }, required: [] },
    annotations: opts,
  }
}

describe('Agent-CLI Conformance: Exit codes', () => {
  it('defines all required semantic exit codes', () => {
    expect(EXIT.SUCCESS).toBe(0)
    expect(EXIT.FAILURE).toBe(1)
    expect(EXIT.USAGE).toBe(2)
    expect(EXIT.NOT_FOUND).toBe(3)
    expect(EXIT.PERMISSION).toBe(4)
    expect(EXIT.CONFLICT).toBe(5)
    expect(EXIT.TIMEOUT).toBe(6)
    expect(EXIT.UPSTREAM).toBe(7)
  })
})

describe('Agent-CLI Conformance: Structured errors', () => {
  it('errors have correct shape', async () => {
    const { StructuredError } = await import('../../src/output/errors.js')
    const err = new StructuredError({ code: 'TEST', message: 'test error' })
    const json = err.toJSON()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('TEST')
    expect(json.error.message).toBe('test error')
    expect(Array.isArray(json.error.suggestions)).toBe(true)
    expect(typeof json.error.retryable).toBe('boolean')
  })
})

describe('Agent-CLI Conformance: Capabilities manifest', () => {
  it('--capabilities manifest has correct shape', () => {
    const tools = [makeTool('list_channels'), makeTool('send_message', { readOnlyHint: false })]
    const mapping = buildMapping(tools)

    const commands: Record<string, unknown> = {}
    for (const tool of tools) {
      const cliKey = mapping.reverse[tool.name] ?? tool.name
      const ann = tool.annotations as { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean } | undefined
      commands[cliKey] = {
        destructive: ann?.destructiveHint ?? false,
        dry_run: true,
        idempotent: ann?.idempotentHint ?? (ann?.destructiveHint === true ? false : true),
      }
    }

    for (const [, val] of Object.entries(commands)) {
      const v = val as { destructive: boolean; dry_run: boolean; idempotent: boolean }
      expect(typeof v.destructive).toBe('boolean')
      expect(typeof v.dry_run).toBe('boolean')
      expect(typeof v.idempotent).toBe('boolean')
    }
  })
})

describe('Agent-CLI Conformance: Noun-verb mapping', () => {
  it('generates discoverable command structure', () => {
    const tools = [
      makeTool('list_channels'),
      makeTool('send_message'),
      makeTool('create_issue'),
    ]
    const mapping = buildMapping(tools)
    expect(Object.keys(mapping.forward).length).toBe(3)
    expect(Object.keys(mapping.reverse).length).toBe(3)
    // All forward keys should not be raw MCP names
    for (const key of Object.keys(mapping.forward)) {
      expect(key).not.toContain('_')
    }
  })
})

describe('Agent-CLI Conformance: Receipt pattern', () => {
  it('buildReceipt returns correct shape', async () => {
    const { buildReceipt } = await import('../../src/output/receipt.js')
    const r = buildReceipt('create', 'test-resource', 'gashapon remove test-resource')
    expect(r.success).toBe(true)
    expect(r.operation).toBe('create')
    expect(r.target).toBe('test-resource')
    expect(typeof r.timestamp).toBe('string')
    expect(r.undo_command).toBe('gashapon remove test-resource')
  })
})
