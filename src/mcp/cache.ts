import fs from 'node:fs/promises'
import path from 'node:path'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { NounVerbMapping } from '../runtime/mapping.js'
import { serverCacheDir } from '../config/paths.js'

export interface CachedSchema {
  version: string
  timestamp: string
  tools: Tool[]
  mapping: NounVerbMapping
}

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export class SchemaCache {
  private readonly baseCacheDir: string

  constructor(baseCacheDir?: string) {
    this.baseCacheDir = baseCacheDir ?? ''
  }

  private cachePath(serverName: string): string {
    const dir = this.baseCacheDir || serverCacheDir(serverName)
    if (this.baseCacheDir) {
      return path.join(this.baseCacheDir, serverName, 'schema.json')
    }
    return path.join(dir, 'schema.json')
  }

  async get(serverName: string): Promise<CachedSchema | null> {
    try {
      const raw = await fs.readFile(this.cachePath(serverName), 'utf8')
      return JSON.parse(raw) as CachedSchema
    } catch {
      return null
    }
  }

  async set(serverName: string, schema: CachedSchema): Promise<void> {
    const p = this.cachePath(serverName)
    await fs.mkdir(path.dirname(p), { recursive: true })
    const tmp = p + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(schema, null, 2) + '\n', 'utf8')
    await fs.rename(tmp, p)
  }

  async invalidate(serverName: string): Promise<void> {
    await fs.unlink(this.cachePath(serverName)).catch(() => { /* already gone */ })
  }

  async isStale(serverName: string, maxAgeMs = DEFAULT_MAX_AGE_MS): Promise<boolean> {
    const cached = await this.get(serverName)
    if (!cached) return true
    const age = Date.now() - new Date(cached.timestamp).getTime()
    return age > maxAgeMs
  }
}
