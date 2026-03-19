import type { OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';
export declare class FileTokenStore {
    private readonly filePath;
    constructor(serverName: string);
    private load;
    private save;
    getTokens(): Promise<OAuthTokens | undefined>;
    saveTokens(tokens: OAuthTokens): Promise<void>;
    getClientInfo(): Promise<OAuthClientInformationMixed | undefined>;
    saveClientInfo(info: OAuthClientInformationMixed): Promise<void>;
    getCodeVerifier(): Promise<string | undefined>;
    saveCodeVerifier(verifier: string): Promise<void>;
    getDiscoveryState(): Promise<OAuthDiscoveryState | undefined>;
    saveDiscoveryState(state: OAuthDiscoveryState): Promise<void>;
    clear(): Promise<void>;
}
