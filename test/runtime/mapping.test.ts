import { describe, it, expect } from 'vitest'
import { buildMapping } from '../../src/runtime/mapping.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

function makeTool(name: string, description?: string): Tool {
  return {
    name,
    description,
    inputSchema: { type: 'object' as const, properties: {} },
  }
}

describe('buildMapping', () => {
  it('maps list_channels → channels list', () => {
    const m = buildMapping([makeTool('list_channels')])
    expect(m.forward['channels list']).toBe('list_channels')
    expect(m.reverse['list_channels']).toBe('channels list')
  })

  it('maps create_pull_request → pull-request create', () => {
    const m = buildMapping([makeTool('create_pull_request')])
    expect(m.forward['pull-request create']).toBe('create_pull_request')
  })

  it('maps send_message → message send', () => {
    const m = buildMapping([makeTool('send_message')])
    expect(m.forward['message send']).toBe('send_message')
  })

  it('maps single verb "search" → root-level', () => {
    const m = buildMapping([makeTool('search')])
    expect(m.forward['search']).toBe('search')
    expect(m.tree['_root']?.['search']).toBeDefined()
  })

  it('maps get_user_by_id → user-by-id get', () => {
    const m = buildMapping([makeTool('get_user_by_id')])
    expect(m.forward['user-by-id get']).toBe('get_user_by_id')
  })

  it('handles verb at end: channels_list', () => {
    const m = buildMapping([makeTool('channels_list')])
    expect(m.forward['channels list']).toBe('channels_list')
  })

  it('builds tree structure', () => {
    const m = buildMapping([makeTool('list_channels'), makeTool('create_channel')])
    // list_channels → noun='channels', verb='list' → tree['channels']['list']
    // create_channel → noun='channel', verb='create' → tree['channel']['create']
    expect(m.tree['channels']).toBeDefined()
    expect(m.tree['channels']['list']).toBeDefined()
    expect(m.tree['channel']).toBeDefined()
    expect(m.tree['channel']['create']).toBeDefined()
  })

  it('handles no-verb tool names', () => {
    const m = buildMapping([makeTool('foobar')])
    expect(m.forward['foobar']).toBe('foobar')
    expect(m.tree['_root']?.['foobar']).toBeDefined()
  })

  it('handles conflicts by falling back to raw names', () => {
    // Two tools that would map to the same noun-verb
    const m = buildMapping([makeTool('list_users'), makeTool('users_list')])
    // Both should be accessible but under their raw names
    expect(Object.keys(m.forward)).toHaveLength(2)
  })
})
