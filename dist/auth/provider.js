import http from 'node:http';
/**
 * OAuthClientProvider for the authorization_code + PKCE flow.
 * Stores tokens/verifier/discovery state to disk, opens a local HTTP server
 * to catch the redirect, and launches the user's browser.
 */
export class CliOAuthProvider {
    store;
    oauthConfig;
    _port;
    _server;
    _codeResolve;
    _codeReject;
    _codePromise;
    _serverUrl;
    constructor(store, oauthConfig, port, serverUrl) {
        this.store = store;
        this.oauthConfig = oauthConfig;
        this._port = port;
        this._serverUrl = serverUrl;
    }
    get redirectUrl() {
        return `http://localhost:${this._port}/callback`;
    }
    get clientMetadata() {
        const meta = {
            client_name: 'gashapon',
            redirect_uris: [this.redirectUrl],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: this.oauthConfig.client_secret ? 'client_secret_basic' : 'none',
        };
        if (this.oauthConfig.scope)
            meta.scope = this.oauthConfig.scope;
        return meta;
    }
    clientInformation() {
        // If a client_id was provided in config, use it directly (pre-registered client)
        if (this.oauthConfig.client_id) {
            const info = {
                client_id: this.oauthConfig.client_id,
                ...(this.oauthConfig.client_secret ? { client_secret: this.oauthConfig.client_secret } : {}),
            };
            return Promise.resolve(info);
        }
        // Otherwise load from store (dynamic registration result)
        return this.store.getClientInfo();
    }
    saveClientInformation(info) {
        return this.store.saveClientInfo(info);
    }
    tokens() {
        return this.store.getTokens();
    }
    saveTokens(tokens) {
        return this.store.saveTokens(tokens);
    }
    async redirectToAuthorization(authorizationUrl) {
        // Ensure the callback server is running so the redirect can be received.
        // During explicit `gashapon auth`, startServer() is called beforehand, but
        // when the SDK triggers re-auth (e.g. expired tokens) this is the entry point.
        if (!this._server) {
            await this.startServer();
            process.stderr.write(`Listening for OAuth callback on http://localhost:${this._port}/callback\n`);
        }
        process.stderr.write(`\nAuthorization required. Opening browser...\n`);
        process.stderr.write(`If the browser doesn't open, visit:\n  ${authorizationUrl}\n\n`);
        try {
            const { default: open } = await import('open');
            await open(authorizationUrl.toString());
        }
        catch {
            // Non-fatal: user can copy the URL manually
        }
        // When called by the SDK's transport (e.g. on 401), auth() returns 'REDIRECT'
        // after this method completes, and the transport treats non-'AUTHORIZED' as failure.
        // To make re-auth work, we block here until the callback code arrives, exchange it
        // for tokens, and stop the server — so the next auth() call finds valid tokens.
        if (this._serverUrl) {
            process.stderr.write('Waiting for authorization code...\n');
            try {
                const code = await this.waitForCode();
                const { auth } = await import('@modelcontextprotocol/sdk/client/auth.js');
                await auth(this, { serverUrl: this._serverUrl, authorizationCode: code });
                process.stderr.write('Authorization successful.\n');
            }
            finally {
                this.stopServer();
            }
        }
    }
    saveCodeVerifier(codeVerifier) {
        return this.store.saveCodeVerifier(codeVerifier);
    }
    async codeVerifier() {
        const v = await this.store.getCodeVerifier();
        if (!v)
            throw new Error('No PKCE code verifier found — restart the auth flow');
        return v;
    }
    discoveryState() {
        return this.store.getDiscoveryState();
    }
    saveDiscoveryState(state) {
        return this.store.saveDiscoveryState(state);
    }
    async invalidateCredentials(scope) {
        if (scope === 'all') {
            await this.store.clear();
        }
        else if (scope === 'tokens') {
            await this.store.clearTokens();
        }
        // For other scopes we just clear everything to be safe
        else {
            await this.store.clear();
        }
    }
    /** Start the local callback server. Call before initiating auth flow. */
    startServer() {
        this._codePromise = new Promise((resolve, reject) => {
            this._codeResolve = resolve;
            this._codeReject = reject;
        });
        this._server = http.createServer((req, res) => {
            try {
                const url = new URL(req.url ?? '/', `http://localhost:${this._port}`);
                if (url.pathname === '/callback') {
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');
                    const errorDesc = url.searchParams.get('error_description');
                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h2>Authorization successful!</h2><p>You can close this tab and return to the terminal.</p></body></html>');
                        this._codeResolve?.(code);
                    }
                    else {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end(`<html><body><h2>Authorization failed</h2><p>${errorDesc ?? error ?? 'Unknown error'}</p></body></html>`);
                        this._codeReject?.(new Error(`OAuth error: ${error} — ${errorDesc ?? ''}`));
                    }
                }
                else {
                    res.writeHead(404);
                    res.end();
                }
            }
            catch (err) {
                res.writeHead(500);
                res.end();
                this._codeReject?.(err);
            }
        });
        return new Promise((resolve, reject) => {
            this._server.listen(this._port, '127.0.0.1', () => resolve());
            this._server.once('error', reject);
        });
    }
    /** Resolves with the authorization code when the user completes the flow. */
    waitForCode() {
        if (!this._codePromise)
            throw new Error('Server not started — call startServer() first');
        return this._codePromise;
    }
    stopServer() {
        this._server?.close();
        this._server = undefined;
    }
}
/** Find a free TCP port on localhost. */
export async function findFreePort() {
    return new Promise((resolve, reject) => {
        const srv = http.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const addr = srv.address();
            srv.close(() => resolve(addr.port));
        });
        srv.once('error', reject);
    });
}
