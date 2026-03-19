import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export interface ToolInfo {
  mcpName: string
  description?: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
  }
}

export interface NounVerbMapping {
  /** "channels list" → "list_channels" */
  forward: Record<string, string>
  /** "list_channels" → "channels list" */
  reverse: Record<string, string>
  /** noun → verb → ToolInfo, for help/discovery */
  tree: Record<string, Record<string, ToolInfo>>
}

const VERBS = new Set([
  'list', 'get', 'create', 'update', 'delete', 'search', 'send', 'archive',
  'read', 'write', 'set', 'remove', 'find', 'add', 'edit', 'count', 'check',
  'export', 'import', 'sync', 'run', 'start', 'stop', 'cancel', 'close',
  'open', 'enable', 'disable', 'move', 'copy', 'merge', 'validate', 'publish',
  'fetch', 'push', 'pull', 'post', 'put', 'patch', 'submit', 'approve',
  'reject', 'restore', 'reset', 'refresh', 'reload', 'download', 'upload',
])

interface ParsedToolName {
  verb: string
  noun: string
}

function parseToolName(toolName: string): ParsedToolName | null {
  const tokens = toolName.split('_').filter(Boolean)
  if (tokens.length === 0) return null

  // Check position 0 (most common: verb_noun)
  if (VERBS.has(tokens[0])) {
    const verb = tokens[0]
    const nounTokens = tokens.slice(1)
    if (nounTokens.length === 0) {
      return { verb, noun: '' } // single-token verb command
    }
    return { verb, noun: nounTokens.join('-') }
  }

  // Check last position (noun_verb)
  if (tokens.length > 1 && VERBS.has(tokens[tokens.length - 1])) {
    const verb = tokens[tokens.length - 1]
    const nounTokens = tokens.slice(0, -1)
    return { verb, noun: nounTokens.join('-') }
  }

  return null
}

function toolToInfo(tool: Tool): ToolInfo {
  return {
    mcpName: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as Record<string, unknown>,
    outputSchema: tool.outputSchema as Record<string, unknown> | undefined,
    annotations: tool.annotations as ToolInfo['annotations'],
  }
}

export function buildMapping(tools: Tool[]): NounVerbMapping {
  const forward: Record<string, string> = {}
  const reverse: Record<string, string> = {}
  const tree: Record<string, Record<string, ToolInfo>> = {}

  // Track used keys for conflict detection
  const usedKeys = new Set<string>()
  const conflicts = new Set<string>()

  for (const tool of tools) {
    const parsed = parseToolName(tool.name)
    let nounVerbKey: string

    if (parsed === null) {
      // No verb found — use the raw tool name as root-level command
      nounVerbKey = tool.name.replace(/_/g, '-')
    } else if (parsed.noun === '') {
      // Single verb, no noun — root-level
      nounVerbKey = parsed.verb
    } else {
      nounVerbKey = `${parsed.noun} ${parsed.verb}`
    }

    // Conflict detection
    if (usedKeys.has(nounVerbKey)) {
      conflicts.add(nounVerbKey)
    }
    usedKeys.add(nounVerbKey)
  }

  for (const tool of tools) {
    const parsed = parseToolName(tool.name)
    let nounVerbKey: string
    let noun: string
    let verb: string

    if (parsed === null) {
      nounVerbKey = tool.name.replace(/_/g, '-')
      noun = '_root'
      verb = nounVerbKey
    } else if (parsed.noun === '') {
      nounVerbKey = parsed.verb
      noun = '_root'
      verb = parsed.verb
    } else {
      nounVerbKey = `${parsed.noun} ${parsed.verb}`
      noun = parsed.noun
      verb = parsed.verb
    }

    // Fall back to raw hyphenated name on conflict
    if (conflicts.has(nounVerbKey) && forward[nounVerbKey]) {
      // Already added a conflicting tool — use raw names for both
      const existingMcp = forward[nounVerbKey]
      const existingRaw = existingMcp.replace(/_/g, '-')
      // Re-map the existing one
      delete forward[nounVerbKey]
      forward[existingRaw] = existingMcp
      reverse[existingMcp] = existingRaw
      // Remap tree
      if (tree[noun]?.[verb]) {
        tree['_root'] ??= {}
        tree['_root'][existingRaw] = tree[noun][verb]
        delete tree[noun][verb]
      }
      nounVerbKey = tool.name.replace(/_/g, '-')
      noun = '_root'
      verb = nounVerbKey
    }

    forward[nounVerbKey] = tool.name
    reverse[tool.name] = nounVerbKey
    tree[noun] ??= {}
    tree[noun][verb] = toolToInfo(tool)
  }

  return { forward, reverse, tree }
}
