import fs from 'node:fs/promises';
import path from 'node:path';
import { GashaponConfigSchema, DEFAULT_CONFIG, ServerNameSchema } from './schema.js';
import { configPath } from './paths.js';
import { conflict, notFound, usageError } from '../output/errors.js';
export class ConfigManager {
    _configPath;
    constructor(customPath) {
        this._configPath = customPath ?? configPath();
    }
    get path() {
        return this._configPath;
    }
    async load() {
        try {
            const raw = await fs.readFile(this._configPath, 'utf8');
            const parsed = JSON.parse(raw);
            return GashaponConfigSchema.parse(parsed);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return { ...DEFAULT_CONFIG, servers: {} };
            }
            throw err;
        }
    }
    async save(config) {
        const dir = path.dirname(this._configPath);
        await fs.mkdir(dir, { recursive: true });
        const tmp = this._configPath + '.tmp';
        await fs.writeFile(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8');
        await fs.rename(tmp, this._configPath);
    }
    async addServer(name, serverConfig) {
        const nameResult = ServerNameSchema.safeParse(name);
        if (!nameResult.success) {
            throw usageError(`Invalid server name "${name}": ${nameResult.error.issues[0].message}`);
        }
        const config = await this.load();
        if (config.servers[name]) {
            throw conflict(`Server "${name}"`, [`Use --force to overwrite`, `Run \`gashapon remove ${name}\` first`]);
        }
        config.servers[name] = serverConfig;
        await this.save(config);
        return config;
    }
    async removeServer(name) {
        const config = await this.load();
        const removed = config.servers[name];
        if (!removed) {
            throw notFound(`Server "${name}"`, [`Run \`gashapon list\` to see available servers`]);
        }
        delete config.servers[name];
        await this.save(config);
        return { config, removed };
    }
    async getServer(name) {
        const config = await this.load();
        return config.servers[name];
    }
    async listServers() {
        const config = await this.load();
        return config.servers;
    }
    async updateServer(name, updates) {
        const config = await this.load();
        if (!config.servers[name]) {
            throw notFound(`Server "${name}"`);
        }
        config.servers[name] = { ...config.servers[name], ...updates };
        await this.save(config);
        return config;
    }
    async forceAddServer(name, serverConfig) {
        const nameResult = ServerNameSchema.safeParse(name);
        if (!nameResult.success) {
            throw usageError(`Invalid server name "${name}": ${nameResult.error.issues[0].message}`);
        }
        const config = await this.load();
        config.servers[name] = serverConfig;
        await this.save(config);
        return config;
    }
}
