import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ConfigManager } from '../../src/config/manager.js'

async function makeManager(): Promise<{ manager: ConfigManager; cleanup: () => Promise<void> }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gashapon-test-'))
  const manager = new ConfigManager(path.join(tmpDir, 'config.json'))
  const cleanup = async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  return { manager, cleanup }
}

describe('ConfigManager', () => {
  it('returns default config when file does not exist', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      const config = await manager.load()
      expect(config.version).toBe('1')
      expect(config.servers).toEqual({})
    } finally {
      await cleanup()
    }
  })

  it('saves and loads config atomically', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      await manager.addServer('test', { transport: 'stdio', command: 'echo', args: [], env: {}, installed: false })
      const config = await manager.load()
      expect(config.servers.test).toBeDefined()
      expect(config.servers.test.transport).toBe('stdio')
    } finally {
      await cleanup()
    }
  })

  it('throws CONFLICT when server already exists', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      await manager.addServer('test', { transport: 'stdio', command: 'echo', args: [], env: {}, installed: false })
      await expect(
        manager.addServer('test', { transport: 'stdio', command: 'echo', args: [], env: {}, installed: false })
      ).rejects.toThrow('already exists')
    } finally {
      await cleanup()
    }
  })

  it('throws NOT_FOUND when removing non-existent server', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      await expect(manager.removeServer('nonexistent')).rejects.toThrow('not found')
    } finally {
      await cleanup()
    }
  })

  it('rejects invalid server names', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      await expect(
        manager.addServer('INVALID', { transport: 'stdio', command: 'echo', args: [], env: {}, installed: false })
      ).rejects.toThrow()
    } finally {
      await cleanup()
    }
  })

  it('updates server fields', async () => {
    const { manager, cleanup } = await makeManager()
    try {
      await manager.addServer('test', { transport: 'stdio', command: 'echo', args: [], env: {}, installed: false })
      await manager.updateServer('test', { installed: true })
      const server = await manager.getServer('test')
      expect(server?.installed).toBe(true)
    } finally {
      await cleanup()
    }
  })
})
