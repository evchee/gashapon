import { describe, it, expect } from 'vitest'
import { CapsuleConfigSchema, ServerNameSchema, StdioServerConfigSchema } from '../../src/config/schema.js'

describe('ServerNameSchema', () => {
  it('accepts valid names', () => {
    expect(ServerNameSchema.parse('slack')).toBe('slack')
    expect(ServerNameSchema.parse('my-server')).toBe('my-server')
    expect(ServerNameSchema.parse('server_1')).toBe('server_1')
  })

  it('rejects invalid names', () => {
    expect(() => ServerNameSchema.parse('')).toThrow()
    expect(() => ServerNameSchema.parse('My Server')).toThrow()
    expect(() => ServerNameSchema.parse('../evil')).toThrow()
    expect(() => ServerNameSchema.parse('$bad')).toThrow()
  })
})

describe('CapsuleConfigSchema', () => {
  it('parses a valid config', () => {
    const config = CapsuleConfigSchema.parse({
      version: '1',
      servers: {
        slack: { transport: 'stdio', command: 'npx', args: ['-y', '@slack/mcp-server'], env: {}, installed: false },
      },
    })
    expect(config.servers.slack.transport).toBe('stdio')
  })

  it('uses defaults for missing fields', () => {
    const config = CapsuleConfigSchema.parse({ version: '1' })
    expect(config.bin_dir).toBe('~/.capsule/bin')
    expect(config.servers).toEqual({})
  })

  it('rejects invalid server names', () => {
    expect(() => CapsuleConfigSchema.parse({
      version: '1',
      servers: { 'INVALID NAME': { transport: 'stdio', command: 'echo' } },
    })).toThrow()
  })
})
