import fs from 'node:fs/promises';
import path from 'node:path';
import { tokenPath } from '../config/paths.js';
export class FileTokenStore {
    filePath;
    constructor(serverName) {
        this.filePath = tokenPath(serverName);
    }
    async load() {
        try {
            const raw = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    async save(data) {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const tmp = `${this.filePath}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
        await fs.rename(tmp, this.filePath);
    }
    async getTokens() {
        return (await this.load()).tokens;
    }
    async saveTokens(tokens) {
        const data = await this.load();
        await this.save({ ...data, tokens });
    }
    async getClientInfo() {
        return (await this.load()).client_info;
    }
    async saveClientInfo(info) {
        const data = await this.load();
        await this.save({ ...data, client_info: info });
    }
    async getCodeVerifier() {
        return (await this.load()).code_verifier;
    }
    async saveCodeVerifier(verifier) {
        const data = await this.load();
        await this.save({ ...data, code_verifier: verifier });
    }
    async getDiscoveryState() {
        return (await this.load()).discovery_state;
    }
    async saveDiscoveryState(state) {
        const data = await this.load();
        await this.save({ ...data, discovery_state: state });
    }
    async clear() {
        try {
            await fs.unlink(this.filePath);
        }
        catch {
            // ignore if not found
        }
    }
}
