import fs from 'node:fs/promises'
import path from 'node:path'
import { CapsuleConfigSchema, DEFAULT_CONFIG, ServerNameSchema, type CapsuleConfig, type ServerConfig } from './schema.js'
import { configPath } from './paths.js'
import { conflict, notFound, usageError } from '../output/errors.js'

export class ConfigManager {
  private readonly _configPath: string

  constructor(customPath?: string) {
    this._configPath = customPath ?? configPath()
  }

  get path(): string {
    return this._configPath
  }

  async load(): Promise<CapsuleConfig> {
    try {
      const raw = await fs.readFile(this._configPath, 'utf8')
      const parsed = JSON.parse(raw)
      return CapsuleConfigSchema.parse(parsed)
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ...DEFAULT_CONFIG, servers: {} }
      }
      throw err
    }
  }

  async save(config: CapsuleConfig): Promise<void> {
    const dir = path.dirname(this._configPath)
    await fs.mkdir(dir, { recursive: true })
    const tmp = this._configPath + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8')
    await fs.rename(tmp, this._configPath)
  }

  async addServer(name: string, serverConfig: ServerConfig): Promise<CapsuleConfig> {
    const nameResult = ServerNameSchema.safeParse(name)
    if (!nameResult.success) {
      throw usageError(`Invalid server name "${name}": ${nameResult.error.issues[0].message}`)
    }
    const config = await this.load()
    if (config.servers[name]) {
      throw conflict(`Server "${name}"`, [`Use --force to overwrite`, `Run \`capsule remove ${name}\` first`])
    }
    config.servers[name] = serverConfig
    await this.save(config)
    return config
  }

  async removeServer(name: string): Promise<{ config: CapsuleConfig; removed: ServerConfig }> {
    const config = await this.load()
    const removed = config.servers[name]
    if (!removed) {
      throw notFound(`Server "${name}"`, [`Run \`capsule list\` to see available servers`])
    }
    delete config.servers[name]
    await this.save(config)
    return { config, removed }
  }

  async getServer(name: string): Promise<ServerConfig | undefined> {
    const config = await this.load()
    return config.servers[name]
  }

  async listServers(): Promise<Record<string, ServerConfig>> {
    const config = await this.load()
    return config.servers
  }

  async updateServer(name: string, updates: Partial<ServerConfig>): Promise<CapsuleConfig> {
    const config = await this.load()
    if (!config.servers[name]) {
      throw notFound(`Server "${name}"`)
    }
    config.servers[name] = { ...config.servers[name], ...updates } as ServerConfig
    await this.save(config)
    return config
  }

  async forceAddServer(name: string, serverConfig: ServerConfig): Promise<CapsuleConfig> {
    const nameResult = ServerNameSchema.safeParse(name)
    if (!nameResult.success) {
      throw usageError(`Invalid server name "${name}": ${nameResult.error.issues[0].message}`)
    }
    const config = await this.load()
    config.servers[name] = serverConfig
    await this.save(config)
    return config
  }
}
