import fs from 'node:fs/promises';
import path from 'node:path';
import { serverCacheDir } from '../config/paths.js';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export class SchemaCache {
    baseCacheDir;
    constructor(baseCacheDir) {
        this.baseCacheDir = baseCacheDir ?? '';
    }
    cachePath(serverName) {
        const dir = this.baseCacheDir || serverCacheDir(serverName);
        if (this.baseCacheDir) {
            return path.join(this.baseCacheDir, serverName, 'schema.json');
        }
        return path.join(dir, 'schema.json');
    }
    async get(serverName) {
        try {
            const raw = await fs.readFile(this.cachePath(serverName), 'utf8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async set(serverName, schema) {
        const p = this.cachePath(serverName);
        await fs.mkdir(path.dirname(p), { recursive: true });
        const tmp = p + '.tmp';
        await fs.writeFile(tmp, JSON.stringify(schema, null, 2) + '\n', 'utf8');
        await fs.rename(tmp, p);
    }
    async invalidate(serverName) {
        await fs.unlink(this.cachePath(serverName)).catch(() => { });
    }
    async isStale(serverName, maxAgeMs = DEFAULT_MAX_AGE_MS) {
        const cached = await this.get(serverName);
        if (!cached)
            return true;
        const age = Date.now() - new Date(cached.timestamp).getTime();
        return age > maxAgeMs;
    }
}
