import os from 'node:os'
import path from 'node:path'
import type { CapsuleConfig } from './schema.js'

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(2))
  }
  return p
}

function resolve(p: string): string {
  return path.resolve(expandHome(p))
}

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg ? xdg : path.join(os.homedir(), '.config')
  return resolve(path.join(base, 'capsule'))
}

export function configPath(): string {
  return path.join(configDir(), 'config.json')
}

export function cacheDir(): string {
  const xdg = process.env.XDG_CACHE_HOME
  const base = xdg ? xdg : path.join(os.homedir(), '.cache')
  return resolve(path.join(base, 'capsule'))
}

export function serverCacheDir(serverName: string): string {
  return path.join(cacheDir(), serverName)
}

export function binDir(config: CapsuleConfig): string {
  return resolve(config.bin_dir)
}

export function completionsDir(): string {
  return path.join(resolve('~/.capsule'), 'completions')
}
