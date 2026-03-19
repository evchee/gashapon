import http from 'node:http'
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { OAuthClientProvider, OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js'
import type { OAuthConfig } from '../config/schema.js'
import type { FileTokenStore } from './token-store.js'

/**
 * OAuthClientProvider for the authorization_code + PKCE flow.
 * Stores tokens/verifier/discovery state to disk, opens a local HTTP server
 * to catch the redirect, and launches the user's browser.
 */
export class CliOAuthProvider implements OAuthClientProvider {
  private readonly _port: number
  private _server?: http.Server
  private _codeResolve?: (code: string) => void
  private _codeReject?: (err: Error) => void
  private _codePromise?: Promise<string>

  constructor(
    private readonly store: FileTokenStore,
    private readonly oauthConfig: OAuthConfig,
    port: number,
  ) {
    this._port = port
  }

  get redirectUrl(): string {
    return `http://localhost:${this._port}/callback`
  }

  get clientMetadata(): OAuthClientMetadata {
    const meta: OAuthClientMetadata = {
      client_name: 'gashapon',
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: this.oauthConfig.client_secret ? 'client_secret_basic' : 'none',
    }
    if (this.oauthConfig.scope) meta.scope = this.oauthConfig.scope
    return meta
  }

  clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    // If a client_id was provided in config, use it directly (pre-registered client)
    if (this.oauthConfig.client_id) {
      const info: OAuthClientInformationMixed = {
        client_id: this.oauthConfig.client_id,
        ...(this.oauthConfig.client_secret ? { client_secret: this.oauthConfig.client_secret } : {}),
      }
      return Promise.resolve(info)
    }
    // Otherwise load from store (dynamic registration result)
    return this.store.getClientInfo()
  }

  saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    return this.store.saveClientInfo(info)
  }

  tokens(): Promise<OAuthTokens | undefined> {
    return this.store.getTokens()
  }

  saveTokens(tokens: OAuthTokens): Promise<void> {
    return this.store.saveTokens(tokens)
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    process.stderr.write(`\nAuthorization required. Opening browser...\n`)
    process.stderr.write(`If the browser doesn't open, visit:\n  ${authorizationUrl}\n\n`)
    try {
      const { default: open } = await import('open')
      await open(authorizationUrl.toString())
    } catch {
      // Non-fatal: user can copy the URL manually
    }
  }

  saveCodeVerifier(codeVerifier: string): Promise<void> {
    return this.store.saveCodeVerifier(codeVerifier)
  }

  async codeVerifier(): Promise<string> {
    const v = await this.store.getCodeVerifier()
    if (!v) throw new Error('No PKCE code verifier found — restart the auth flow')
    return v
  }

  discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return this.store.getDiscoveryState()
  }

  saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    return this.store.saveDiscoveryState(state)
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): Promise<void> {
    if (scope === 'all') {
      await this.store.clear()
    } else if (scope === 'tokens') {
      await this.store.clearTokens()
    }
    // For other scopes we just clear everything to be safe
    else {
      await this.store.clear()
    }
  }

  /** Start the local callback server. Call before initiating auth flow. */
  startServer(): Promise<void> {
    this._codePromise = new Promise<string>((resolve, reject) => {
      this._codeResolve = resolve
      this._codeReject = reject
    })

    this._server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost:${this._port}`)
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')
          const errorDesc = url.searchParams.get('error_description')

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h2>Authorization successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>')
            this._codeResolve?.(code)
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<html><body><h2>Authorization failed</h2><p>${errorDesc ?? error ?? 'Unknown error'}</p></body></html>`)
            this._codeReject?.(new Error(`OAuth error: ${error} — ${errorDesc ?? ''}`))
          }
        } else {
          res.writeHead(404)
          res.end()
        }
      } catch (err) {
        res.writeHead(500)
        res.end()
        this._codeReject?.(err as Error)
      }
    })

    return new Promise((resolve, reject) => {
      this._server!.listen(this._port, '127.0.0.1', () => resolve())
      this._server!.once('error', reject)
    })
  }

  /** Resolves with the authorization code when the user completes the flow. */
  waitForCode(): Promise<string> {
    if (!this._codePromise) throw new Error('Server not started — call startServer() first')
    return this._codePromise
  }

  stopServer(): void {
    this._server?.close()
    this._server = undefined
  }
}

/** Find a free TCP port on localhost. */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as { port: number }
      srv.close(() => resolve(addr.port))
    })
    srv.once('error', reject)
  })
}
