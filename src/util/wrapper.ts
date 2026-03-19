import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

/**
 * Resolve the absolute path to the gashapon binary.
 * Uses process.argv[0] (the node binary), but the actual gashapon script
 * is process.argv[1] when running as a bin script.
 * Falls back to `which gashapon`.
 */
function resolveGashaponBin(): string {
  // When running as installed bin, process.argv[1] is the gashapon bin script
  if (process.argv[1] && process.argv[1].includes('gashapon')) {
    return path.resolve(process.argv[1])
  }
  // Try which
  try {
    const result = execSync('which gashapon', { encoding: 'utf8' }).trim()
    if (result) return result
  } catch { /* fall through */ }
  // Fallback to 'gashapon' and hope it's on PATH
  return 'gashapon'
}

export async function generateWrapper(binDir: string, serverName: string): Promise<void> {
  await fs.mkdir(binDir, { recursive: true })
  const gashaponBin = resolveGashaponBin()
  const wrapperPath = path.join(binDir, serverName)
  const content = `#!/bin/sh\nexec ${gashaponBin} exec ${serverName} "$@"\n`
  await fs.writeFile(wrapperPath, content, { mode: 0o755 })
}

export async function removeWrapper(binDir: string, serverName: string): Promise<void> {
  const wrapperPath = path.join(binDir, serverName)
  await fs.unlink(wrapperPath)
}
