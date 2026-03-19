import fs from 'node:fs/promises'
import path from 'node:path'
import type { OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js'
import { tokenPath } from '../config/paths.js'

interface StoredAuthData {
  tokens?: OAuthTokens
  client_info?: OAuthClientInformationMixed
  code_verifier?: string
  discovery_state?: OAuthDiscoveryState
}

export class FileTokenStore {
  private readonly filePath: string

  constructor(serverName: string) {
    this.filePath = tokenPath(serverName)
  }

  private async load(): Promise<StoredAuthData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as StoredAuthData
    } catch {
      return {}
    }
  }

  private async save(data: StoredAuthData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tmp = `${this.filePath}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
    await fs.rename(tmp, this.filePath)
  }

  async getTokens(): Promise<OAuthTokens | undefined> {
    return (await this.load()).tokens
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const data = await this.load()
    await this.save({ ...data, tokens })
  }

  async clearTokens(): Promise<void> {
    const data = await this.load()
    delete data.tokens
    await this.save(data)
  }

  async getClientInfo(): Promise<OAuthClientInformationMixed | undefined> {
    return (await this.load()).client_info
  }

  async saveClientInfo(info: OAuthClientInformationMixed): Promise<void> {
    const data = await this.load()
    await this.save({ ...data, client_info: info })
  }

  async getCodeVerifier(): Promise<string | undefined> {
    return (await this.load()).code_verifier
  }

  async saveCodeVerifier(verifier: string): Promise<void> {
    const data = await this.load()
    await this.save({ ...data, code_verifier: verifier })
  }

  async getDiscoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return (await this.load()).discovery_state
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    const data = await this.load()
    await this.save({ ...data, discovery_state: state })
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath)
    } catch {
      // ignore if not found
    }
  }
}
